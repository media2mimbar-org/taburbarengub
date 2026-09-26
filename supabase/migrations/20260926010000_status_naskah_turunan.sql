-- Status penilaian naskah tidak lagi disimpan (sesi 26 Sep, docs/BACKEND.md §3.12).
-- Peserta tidak boleh tahu naskahnya sudah dinilai sebelum raport terbit: tidak
-- ada manfaatnya, dan berlawanan dengan raport serentak. Kolom
-- writing_submissions.status terbaca penulis lewat policy baris sendiri, jadi
-- kolomnya dibuang. "Sudah dinilai" = ada barisnya di penilaian_naskah, yang
-- hanya terbaca penilai. Sekaligus menghapus data ganda (status vs baris penilaian).

-- naskah_mengikat memakai ws.*, yang dibekukan saat view dibuat; definisinya sama persis.
DROP VIEW public.naskah_mengikat;
ALTER TABLE public.writing_submissions DROP COLUMN status;
CREATE VIEW public.naskah_mengikat WITH (security_invoker = true) AS
SELECT DISTINCT ON (ws.user_id, ws.kloter_id) ws.*
FROM public.writing_submissions ws
JOIN public.user_seasons us
  ON us.user_id = ws.user_id
 AND us.kloter_daftar_id = ws.kloter_id
ORDER BY ws.user_id, ws.kloter_id, ws.versi DESC;

-- nilai_karya kini mengembalikan baris penilaiannya, bukan baris naskah.
DROP FUNCTION public.nilai_karya(uuid, jsonb);
CREATE FUNCTION public.nilai_karya(p_submission_id uuid, p_nilai jsonb) RETURNS public.penilaian_naskah
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row    public.writing_submissions;
  v_kloter public.kloters;
  v_hasil  public.penilaian_naskah;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak' USING errcode = '42501', hint = 'AKSES_DITOLAK';
  END IF;

  SELECT * INTO v_row FROM public.writing_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Naskah tidak ditemukan' USING errcode = 'P0002', hint = 'NASKAH_TIDAK_DITEMUKAN';
  END IF;

  IF NOT app_internal.boleh_menilai_naskah(v_row.file_url) THEN
    RAISE EXCEPTION 'Bukan penilai naskah ini' USING errcode = '42501', hint = 'BUKAN_PENILAI';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.naskah_mengikat nm WHERE nm.id = v_row.id) THEN
    RAISE EXCEPTION 'Hanya versi terakhir di kloter asal yang dinilai'
      USING errcode = '22000', hint = 'BUKAN_NASKAH_MENGIKAT';
  END IF;

  SELECT * INTO v_kloter FROM public.kloters WHERE id = v_row.kloter_id;
  IF now() < v_kloter.tgl_tenggat_setor THEN
    RAISE EXCEPTION 'Penilaian dibuka setelah tenggat setor'
      USING errcode = '55000', hint = 'PENILAIAN_BELUM_DIBUKA';
  END IF;
  IF v_kloter.status <> 'berjalan' THEN
    RAISE EXCEPTION 'Kloter sudah ditutup' USING errcode = '55000', hint = 'KLOTER_SUDAH_DITUTUP';
  END IF;

  -- Menilai ulang selama kloter belum ditutup menimpa nilai dan penilainya.
  INSERT INTO public.penilaian_naskah (submission_id, nilai, dinilai_oleh)
  VALUES (p_submission_id, p_nilai, (SELECT auth.uid()))
  ON CONFLICT (submission_id) DO UPDATE
    SET nilai = excluded.nilai, dinilai_oleh = excluded.dinilai_oleh, dinilai_at = now()
  RETURNING * INTO v_hasil;

  RETURN v_hasil;
END;
$$;

REVOKE ALL ON FUNCTION public.nilai_karya(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nilai_karya(uuid, jsonb) TO authenticated, service_role;

-- Penjaga "selesaikan": naskah mengikat tanpa baris penilaian = belum dinilai.
CREATE OR REPLACE FUNCTION public.ubah_status_kloter(p_kloter_id uuid, p_aksi text) RETURNS public.kloters
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_kloter public.kloters;
BEGIN
  IF NOT app_internal.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak' USING errcode = '42501', hint = 'AKSES_DITOLAK';
  END IF;

  SELECT * INTO v_kloter FROM public.kloters WHERE id = p_kloter_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kloter tidak ditemukan' USING errcode = 'P0002', hint = 'KLOTER_TIDAK_DITEMUKAN';
  END IF;

  IF p_aksi = 'publikasikan' THEN
    IF v_kloter.status <> 'draft' THEN
      RAISE EXCEPTION 'Hanya kloter draft yang bisa dipublikasikan' USING errcode = '55000', hint = 'BUKAN_DRAFT';
    END IF;
    -- Bentrok jadwal ditolak kloter_tidak_overlap.
    UPDATE public.kloters SET status = 'berjalan' WHERE id = p_kloter_id RETURNING * INTO v_kloter;

  ELSIF p_aksi = 'batal_publikasi' THEN
    IF v_kloter.status <> 'berjalan' THEN
      RAISE EXCEPTION 'Kloter tidak sedang berjalan' USING errcode = '55000', hint = 'BUKAN_BERJALAN';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_seasons WHERE kloter_daftar_id = p_kloter_id)
       OR EXISTS (SELECT 1 FROM public.writing_submissions WHERE kloter_id = p_kloter_id) THEN
      RAISE EXCEPTION 'Kloter sudah punya peserta atau naskah' USING errcode = '55000', hint = 'KLOTER_SUDAH_DIPAKAI';
    END IF;
    UPDATE public.kloters SET status = 'draft' WHERE id = p_kloter_id RETURNING * INTO v_kloter;

  ELSIF p_aksi = 'selesaikan' THEN
    IF v_kloter.status <> 'berjalan' THEN
      RAISE EXCEPTION 'Kloter tidak sedang berjalan' USING errcode = '55000', hint = 'BUKAN_BERJALAN';
    END IF;
    IF now() < v_kloter.tgl_tenggat_setor THEN
      RAISE EXCEPTION 'Tenggat setor belum lewat' USING errcode = '55000', hint = 'TENGGAT_BELUM_LEWAT';
    END IF;
    -- A.3, lewat view supaya naskah latihan dan versi lama tidak ikut dihitung (§5.2).
    IF EXISTS (
      SELECT 1 FROM public.naskah_mengikat nm
      WHERE nm.kloter_id = p_kloter_id
        AND NOT EXISTS (SELECT 1 FROM public.penilaian_naskah pn WHERE pn.submission_id = nm.id)
    ) THEN
      RAISE EXCEPTION 'Masih ada naskah mengikat yang belum dinilai'
        USING errcode = '55000', hint = 'MASIH_ADA_NASKAH_BELUM_DINILAI';
    END IF;
    UPDATE public.kloters SET status = 'wrapped', tanggal_selesai = now()
    WHERE id = p_kloter_id RETURNING * INTO v_kloter;

  ELSE
    RAISE EXCEPTION 'Aksi tidak dikenal: %', p_aksi USING errcode = '22000', hint = 'AKSI_TIDAK_DIKENAL';
  END IF;

  RETURN v_kloter;
END;
$$;
