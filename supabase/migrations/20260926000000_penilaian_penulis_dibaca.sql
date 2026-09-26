-- Tiga tambalan panel penilaian (sesi 26 Sep, docs/BACKEND.md §3.12):
-- 1. Nilai pindah ke tabel sendiri. Sebelumnya `writing_submissions.nilai` terbaca
--    penulisnya lewat policy baris sendiri, jadi nilai bocor sebelum raport terbit.
--    Grant kolom tidak bisa menutupnya: peserta, mentor, dan admin sama-sama
--    berperan `authenticated`. Tabel sendiri + RLS penilai juga mencatat siapa menilai.
-- 2. Mentor melihat penulis naskah (nama + WA) untuk mengirim arahan lewat WhatsApp.
--    Policy `users` tetap sempit; datanya lewat RPC yang hanya membuka dua kolom.
-- 3. Log baca per mentor: "versi baru sejak terakhir dibuka" dan "sudah dibaca siapa".

-- ---------- 1. penilaian_naskah ----------
CREATE TABLE public.penilaian_naskah (
  submission_id uuid PRIMARY KEY REFERENCES public.writing_submissions(id),
  nilai         jsonb NOT NULL,
  dinilai_oleh  uuid NOT NULL REFERENCES public.users(id),
  dinilai_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX penilaian_naskah_dinilai_oleh_idx ON public.penilaian_naskah (dinilai_oleh);

ALTER TABLE public.penilaian_naskah ENABLE ROW LEVEL SECURITY;
-- Tulis hanya lewat nilai_karya. Baca: penilai naskah itu. Penulis tidak membaca
-- nilainya di sini; nilai sampai ke peserta lewat raport (§3.6), yang menyalinnya.
CREATE POLICY penilaian_naskah_select ON public.penilaian_naskah FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.writing_submissions ws
    WHERE ws.id = submission_id AND app_internal.boleh_menilai_naskah(ws.file_url)
  ));

-- naskah_mengikat memakai ws.*, yang dibekukan saat view dibuat; definisinya sama persis.
DROP VIEW public.naskah_mengikat;
ALTER TABLE public.writing_submissions DROP COLUMN nilai;
CREATE VIEW public.naskah_mengikat WITH (security_invoker = true) AS
SELECT DISTINCT ON (ws.user_id, ws.kloter_id) ws.*
FROM public.writing_submissions ws
JOIN public.user_seasons us
  ON us.user_id = ws.user_id
 AND us.kloter_daftar_id = ws.kloter_id
ORDER BY ws.user_id, ws.kloter_id, ws.versi DESC;

CREATE OR REPLACE FUNCTION public.nilai_karya(p_submission_id uuid, p_nilai jsonb) RETURNS public.writing_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row    public.writing_submissions;
  v_kloter public.kloters;
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
    SET nilai = excluded.nilai, dinilai_oleh = excluded.dinilai_oleh, dinilai_at = now();

  UPDATE public.writing_submissions SET status = 'dinilai'
  WHERE id = p_submission_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ---------- 2. get_penulis_naskah ----------
-- Penulis naskah di satu kloter jendela, hanya untuk penilai. Kolom sengaja dua:
-- nama untuk dikenali, no_hp untuk dihubungi. Data profil lain tetap tertutup.
CREATE FUNCTION public.get_penulis_naskah(p_kloter_id uuid)
RETURNS TABLE (user_id uuid, nama text, no_hp text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT app_internal.is_penilai() THEN
    RAISE EXCEPTION 'Bukan penilai' USING errcode = '42501', hint = 'BUKAN_PENILAI';
  END IF;

  RETURN QUERY
  SELECT DISTINCT u.id, u.nama, u.no_hp
  FROM public.writing_submissions ws
  JOIN public.users u ON u.id = ws.user_id
  WHERE ws.kloter_id = p_kloter_id
    AND app_internal.boleh_menilai_naskah(ws.file_url);
END;
$$;

-- ---------- 3. naskah_dibaca ----------
CREATE TABLE public.naskah_dibaca (
  submission_id uuid NOT NULL REFERENCES public.writing_submissions(id),
  mentor_id     uuid NOT NULL REFERENCES public.users(id),
  dibaca_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (submission_id, mentor_id)
);
CREATE INDEX naskah_dibaca_mentor_id_idx ON public.naskah_dibaca (mentor_id);

ALTER TABLE public.naskah_dibaca ENABLE ROW LEVEL SECURITY;
-- Penilai saling melihat siapa sudah membaca apa. Tulis hanya lewat tandai_dibaca.
CREATE POLICY naskah_dibaca_select ON public.naskah_dibaca FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.writing_submissions ws
    WHERE ws.id = submission_id AND app_internal.boleh_menilai_naskah(ws.file_url)
  ));

-- Dipanggil panel saat penilai membuka berkas. Berkasnya sendiri dibuka lewat
-- Storage (signed URL), jadi DB tidak bisa mencatat bacaan tanpa panggilan ini.
CREATE FUNCTION public.tandai_dibaca(p_submission_id uuid) RETURNS public.naskah_dibaca
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_path  text;
  v_hasil public.naskah_dibaca;
BEGIN
  -- Peran dulu, baru keberadaan naskah: bukan penilai tidak boleh bisa menebak ID mana yang ada.
  IF (SELECT auth.uid()) IS NULL OR NOT app_internal.is_penilai() THEN
    RAISE EXCEPTION 'Bukan penilai' USING errcode = '42501', hint = 'BUKAN_PENILAI';
  END IF;

  SELECT file_url INTO v_path FROM public.writing_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Naskah tidak ditemukan' USING errcode = 'P0002', hint = 'NASKAH_TIDAK_DITEMUKAN';
  END IF;
  IF NOT app_internal.boleh_menilai_naskah(v_path) THEN
    RAISE EXCEPTION 'Bukan penilai naskah ini' USING errcode = '42501', hint = 'BUKAN_PENILAI';
  END IF;

  INSERT INTO public.naskah_dibaca (submission_id, mentor_id)
  VALUES (p_submission_id, (SELECT auth.uid()))
  ON CONFLICT (submission_id, mentor_id) DO UPDATE SET dibaca_at = now()
  RETURNING * INTO v_hasil;

  RETURN v_hasil;
END;
$$;

REVOKE ALL ON FUNCTION public.get_penulis_naskah(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_penulis_naskah(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.tandai_dibaca(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tandai_dibaca(uuid) TO authenticated, service_role;
