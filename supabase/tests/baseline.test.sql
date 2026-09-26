-- Tes perilaku baseline (docs/BACKEND.md §8). Jalankan: supabase test db
-- Satu transaksi → now() tetap; fase kloter digeser dengan mengubah tanggal b1–b5.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

-- ---------- kerangka ----------
CREATE TEMP TABLE u (nama text PRIMARY KEY, id uuid);
CREATE TEMP TABLE ref (nama text PRIMARY KEY, id uuid);
CREATE TEMP TABLE hasil (urut serial, label text UNIQUE, nilai text, harap text);
GRANT ALL ON u, ref, hasil TO PUBLIC;
GRANT ALL ON SEQUENCE hasil_urut_seq TO PUBLIC;

-- Bertindak sebagai pengguna bernama (atau 'anon').
CREATE FUNCTION pg_temp.sebagai(p_nama text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_nama = 'anon' THEN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    SET LOCAL ROLE anon;
  ELSE
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', (SELECT id FROM u WHERE nama = p_nama), 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
  END IF;
END $$;

-- Jalankan kueri; catat nilainya, atau hint RPC (UPPER_SNAKE), atau SQLSTATE.
CREATE FUNCTION pg_temp.catat(p_label text, p_harap text, p_q text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v text; h text; s text;
BEGIN
  BEGIN
    EXECUTE p_q INTO v;
    v := coalesce(v, '∅');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS h = PG_EXCEPTION_HINT, s = RETURNED_SQLSTATE;
    v := CASE WHEN h ~ '^[A-Z_]+$' THEN h ELSE s END;
  END;
  INSERT INTO hasil (label, nilai, harap) VALUES (p_label, v, p_harap);
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.sebagai(text), pg_temp.catat(text, text, text) TO PUBLIC;

-- ---------- data ----------
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       n || '@tes.local', '{}', now(), now()
FROM unnest(ARRAY['admin', 'mentor', 'a', 'b', 'd', 'e', 'c', 'x']) AS n;
INSERT INTO u SELECT split_part(email, '@', 1), id FROM auth.users WHERE email LIKE '%@tes.local';
UPDATE public.users SET role = 'admin'  WHERE id = (SELECT id FROM u WHERE nama = 'admin');
UPDATE public.users SET role = 'mentor' WHERE id = (SELECT id FROM u WHERE nama = 'mentor');

INSERT INTO ref
SELECT 's0', id FROM public.seasons WHERE nomor_kaidah = 0 UNION ALL
SELECT 's1', id FROM public.seasons WHERE nomor_kaidah = 1 UNION ALL
SELECT 'k1', k.id FROM public.kloters k JOIN public.seasons s ON s.id = k.season_id WHERE s.nomor_kaidah = 1 UNION ALL
SELECT 'kelas1', k.id FROM public.kelas k JOIN public.seasons s ON s.id = k.season_id WHERE s.nomor_kaidah = 1 AND k.nomor = 1 UNION ALL
SELECT 'kelas2', k.id FROM public.kelas k JOIN public.seasons s ON s.id = k.season_id WHERE s.nomor_kaidah = 1 AND k.nomor = 2 UNION ALL
SELECT 'kelas_arsip', k.id FROM public.kelas k JOIN public.seasons s ON s.id = k.season_id WHERE s.nomor_kaidah = 0 AND k.nomor = 1;

-- Kloter 1 mundur ke masa lalu (masa penilaian, belum ditutup); kloter 2 baru di fase pendaftaran.
UPDATE public.seasons SET tanggal_mulai = now() - interval '120 days' WHERE id = (SELECT id FROM ref WHERE nama = 's1');
UPDATE public.kloters SET tanggal_mulai = now() - interval '100 days', tgl_mulai_orientasi = now() - interval '95 days',
  tgl_mulai_menyimak = now() - interval '90 days', tgl_mulai_setor = now() - interval '70 days',
  tgl_tenggat_setor = now() - interval '60 days'
WHERE id = (SELECT id FROM ref WHERE nama = 'k1');
WITH k AS (
  INSERT INTO public.kloters (season_id, nomor, kapasitas, status, tanggal_mulai, tgl_mulai_orientasi,
    tgl_mulai_menyimak, tgl_mulai_setor, tgl_tenggat_setor)
  VALUES ((SELECT id FROM ref WHERE nama = 's1'), 2, 2, 'berjalan', now() - interval '1 day',
    now() + interval '1 day', now() + interval '2 days', now() + interval '10 days', now() + interval '20 days')
  RETURNING id)
INSERT INTO ref SELECT 'k2', id FROM k;

-- A anggota kloter 1 (didaftarkan dulu, saat kloter 1 masih di pendaftaran).
INSERT INTO public.user_seasons (user_id, season_id, kloter_daftar_id, jenis, sumber)
VALUES ((SELECT id FROM u WHERE nama = 'a'), (SELECT id FROM ref WHERE nama = 's1'),
        (SELECT id FROM ref WHERE nama = 'k1'), 'bimbingan', 'gratis');

-- ======================================================================
-- Fase pendaftaran kloter 2
-- ======================================================================
SELECT pg_temp.sebagai('admin');
SELECT pg_temp.catat('daftar: B masuk kloter 2 sebagai bimbingan', 'bimbingan',
  format('SELECT jenis FROM public.daftarkan_peserta(%L, %L, ''beli'')', (SELECT id FROM u WHERE nama = 'b'), (SELECT id FROM ref WHERE nama = 's1')));
SELECT pg_temp.catat('daftar: D masuk kloter 2', 'bimbingan',
  format('SELECT jenis FROM public.daftarkan_peserta(%L, %L, ''beli'')', (SELECT id FROM u WHERE nama = 'd'), (SELECT id FROM ref WHERE nama = 's1')));
SELECT pg_temp.catat('test 5: daftar melewati kapasitas ditolak', 'KLOTER_PENUH',
  format('SELECT jenis FROM public.daftarkan_peserta(%L, %L, ''beli'')', (SELECT id FROM u WHERE nama = 'e'), (SELECT id FROM ref WHERE nama = 's1')));
SELECT pg_temp.catat('daftar: dua kali di season yang sama ditolak', 'SUDAH_TERDAFTAR',
  format('SELECT jenis FROM public.daftarkan_peserta(%L, %L, ''beli'')', (SELECT id FROM u WHERE nama = 'b'), (SELECT id FROM ref WHERE nama = 's1')));
SELECT pg_temp.catat('daftar: season selesai → arsip tanpa kloter', 'arsip',
  format('SELECT jenis || coalesce(kloter_daftar_id::text, '''') FROM public.daftarkan_peserta(%L, %L, ''beli'')', (SELECT id FROM u WHERE nama = 'c'), (SELECT id FROM ref WHERE nama = 's0')));
SELECT pg_temp.catat('test 7: admin ubah kloters.status langsung ditolak', '42501',
  format('UPDATE public.kloters SET status = ''wrapped'' WHERE id = %L RETURNING 1', (SELECT id FROM ref WHERE nama = 'k2')));
SELECT pg_temp.catat('admin ubah seasons.terbit langsung ditolak', '42501',
  format('UPDATE public.seasons SET terbit = false WHERE id = %L RETURNING 1', (SELECT id FROM ref WHERE nama = 's1')));
SELECT pg_temp.catat('admin ubah isi soal ditolak', '42501', 'UPDATE public.soal SET pertanyaan = ''x'' RETURNING 1');
SELECT pg_temp.catat('admin hapus soal ditolak', '42501', 'DELETE FROM public.soal RETURNING 1');

SELECT pg_temp.sebagai('x');
SELECT pg_temp.catat('daftar: peserta biasa tidak bisa mendaftarkan', 'AKSES_DITOLAK',
  format('SELECT jenis FROM public.daftarkan_peserta(%L, %L, ''beli'')', (SELECT id FROM u WHERE nama = 'x'), (SELECT id FROM ref WHERE nama = 's0')));
SELECT pg_temp.catat('video: bukan pemilik season terkunci', 'false',
  format('SELECT public.get_video_url(%L) IS NOT NULL', (SELECT id FROM ref WHERE nama = 'kelas1')));

SELECT pg_temp.sebagai('a');
SELECT pg_temp.catat('test 1+2: anggota kloter lama menonton saat kloter baru di pendaftaran', 'true',
  format('SELECT public.get_video_url(%L) IS NOT NULL', (SELECT id FROM ref WHERE nama = 'kelas1')));
SELECT pg_temp.sebagai('b');
SELECT pg_temp.catat('video: anggota baru sebelum b3 terkunci', 'false',
  format('SELECT public.get_video_url(%L) IS NOT NULL', (SELECT id FROM ref WHERE nama = 'kelas1')));
SELECT pg_temp.sebagai('c');
SELECT pg_temp.catat('test 4: arsip menonton video season arsip', 'true',
  format('SELECT public.get_video_url(%L) IS NOT NULL', (SELECT id FROM ref WHERE nama = 'kelas_arsip')));
SELECT pg_temp.catat('test 4: arsip tidak bisa membuka kuis', 'BUKAN_PESERTA_BIMBINGAN',
  format('SELECT count(*) FROM public.get_soal_kelas(%L)', (SELECT id FROM ref WHERE nama = 'kelas_arsip')));
SELECT pg_temp.sebagai('anon');
SELECT pg_temp.catat('anon tidak bisa membaca livestream_url', '42501', 'SELECT livestream_url FROM public.kloters LIMIT 1');
RESET ROLE;

-- ======================================================================
-- Fase menyimak kloter 2: kuis
-- ======================================================================
UPDATE public.kloters SET tanggal_mulai = now() - interval '10 days', tgl_mulai_orientasi = now() - interval '8 days',
  tgl_mulai_menyimak = now() - interval '1 day', tgl_mulai_setor = now() + interval '5 days',
  tgl_tenggat_setor = now() + interval '15 days'
WHERE id = (SELECT id FROM ref WHERE nama = 'k2');

SELECT pg_temp.sebagai('b');
SELECT pg_temp.catat('kuis: membuka kuis menyajikan 5 soal', '5',
  format('SELECT count(*) FROM public.get_soal_kelas(%L)', (SELECT id FROM ref WHERE nama = 'kelas1')));
SELECT pg_temp.catat('kuis: bank kurang → belum tersedia', 'KUIS_BELUM_TERSEDIA',
  format('SELECT count(*) FROM public.get_soal_kelas(%L)', (SELECT id FROM ref WHERE nama = 'kelas2')));
SELECT pg_temp.catat('kuis: peserta tidak bisa membaca tabel soal', '0', 'SELECT count(*) FROM public.soal');
SELECT pg_temp.catat('kuis: jawaban untuk soal di luar undian ditolak', 'JAWABAN_TIDAK_VALID',
  format('SELECT skor FROM public.jawab_kuis(%L, ''{"00000000-0000-0000-0000-000000000999": 0}'')', (SELECT id FROM ref WHERE nama = 'kelas1')));
SELECT pg_temp.sebagai('a');
SELECT pg_temp.catat('kuis: jendela kloter lama sudah tutup', 'KUIS_TUTUP',
  format('SELECT count(*) FROM public.get_soal_kelas(%L)', (SELECT id FROM ref WHERE nama = 'kelas1')));
SELECT pg_temp.sebagai('d');
SELECT pg_temp.catat('kuis: D membuka kuis', '5',
  format('SELECT count(*) FROM public.get_soal_kelas(%L)', (SELECT id FROM ref WHERE nama = 'kelas1')));
RESET ROLE;

-- B menjawab semua pilihan 0; D menjawab semua benar.
CREATE TEMP TABLE jawab AS
SELECT kp.user_id,
       jsonb_object_agg(s.id::text, CASE WHEN kp.user_id = (SELECT id FROM u WHERE nama = 'd') THEN s.kunci ELSE 0 END) AS jawaban
FROM public.kuis_peserta kp
JOIN public.soal s ON s.id = ANY (kp.soal_terpilih)
WHERE kp.kelas_id = (SELECT id FROM ref WHERE nama = 'kelas1')
GROUP BY kp.user_id;
GRANT SELECT ON jawab TO PUBLIC;

SELECT pg_temp.sebagai('b');
SELECT pg_temp.catat('kuis: B mengirim jawaban', 'ok',
  format('SELECT ''ok'' FROM public.jawab_kuis(%L, %L)', (SELECT id FROM ref WHERE nama = 'kelas1'),
         (SELECT jawaban FROM jawab WHERE user_id = (SELECT id FROM u WHERE nama = 'b'))));
SELECT pg_temp.catat('kuis: jawaban kedua ditolak', 'KUIS_SUDAH_DIJAWAB',
  format('SELECT ''ok'' FROM public.jawab_kuis(%L, %L)', (SELECT id FROM ref WHERE nama = 'kelas1'),
         (SELECT jawaban FROM jawab WHERE user_id = (SELECT id FROM u WHERE nama = 'b'))));
SELECT pg_temp.sebagai('d');
SELECT pg_temp.catat('kuis: semua benar → skor 5', '5',
  format('SELECT skor FROM public.jawab_kuis(%L, %L)', (SELECT id FROM ref WHERE nama = 'kelas1'),
         (SELECT jawaban FROM jawab WHERE user_id = (SELECT id FROM u WHERE nama = 'd'))));
RESET ROLE;

-- Test 8: koreksi kunci satu soal milik B (kunci ≠ 0) menjadi 0.
INSERT INTO ref
SELECT 'soal_koreksi', s.id
FROM public.kuis_peserta kp JOIN public.soal s ON s.id = ANY (kp.soal_terpilih)
WHERE kp.user_id = (SELECT id FROM u WHERE nama = 'b') AND kp.kelas_id = (SELECT id FROM ref WHERE nama = 'kelas1') AND s.kunci <> 0
LIMIT 1;
CREATE TEMP TABLE skor_awal AS
SELECT kp.user_id, kp.skor, (SELECT id FROM ref WHERE nama = 'soal_koreksi') = ANY (kp.soal_terpilih) AS kena
FROM public.kuis_peserta kp WHERE kp.kelas_id = (SELECT id FROM ref WHERE nama = 'kelas1');
GRANT SELECT ON skor_awal TO PUBLIC;

SELECT pg_temp.sebagai('admin');
SELECT pg_temp.catat('test 8: koreksi_kunci menghitung ulang jawaban yang memuat soal itu',
  (SELECT count(*)::text FROM skor_awal WHERE kena),
  format('SELECT public.koreksi_kunci(%L, 0::smallint)', (SELECT id FROM ref WHERE nama = 'soal_koreksi')));
RESET ROLE;
SELECT pg_temp.catat('test 8: skor B naik satu', (SELECT (skor + 1)::text FROM skor_awal WHERE user_id = (SELECT id FROM u WHERE nama = 'b')),
  format('SELECT skor FROM public.kuis_peserta WHERE user_id = %L AND kelas_id = %L', (SELECT id FROM u WHERE nama = 'b'), (SELECT id FROM ref WHERE nama = 'kelas1')));
SELECT pg_temp.catat('test 8: skor D turun hanya kalau soalnya ikut diundi', (SELECT (skor - kena::int)::text FROM skor_awal WHERE user_id = (SELECT id FROM u WHERE nama = 'd')),
  format('SELECT skor FROM public.kuis_peserta WHERE user_id = %L AND kelas_id = %L', (SELECT id FROM u WHERE nama = 'd'), (SELECT id FROM ref WHERE nama = 'kelas1')));

-- Test 10: batas jendela kuis tepat di b4.
UPDATE public.kloters SET tgl_mulai_setor = now() + interval '1 microsecond' WHERE id = (SELECT id FROM ref WHERE nama = 'k2');
SELECT pg_temp.catat('test 10: sesaat sebelum b4 kuis terbuka', 'terbuka',
  format('SELECT app_internal.status_jendela_kuis(%L)', (SELECT id FROM ref WHERE nama = 'k2')));
UPDATE public.kloters SET tgl_mulai_setor = now() WHERE id = (SELECT id FROM ref WHERE nama = 'k2');
SELECT pg_temp.catat('test 10: tepat di b4 kuis tutup', 'tutup',
  format('SELECT app_internal.status_jendela_kuis(%L)', (SELECT id FROM ref WHERE nama = 'k2')));

-- ======================================================================
-- Fase setor kloter 2
-- ======================================================================
UPDATE public.kloters SET tgl_mulai_setor = now() - interval '1 hour', tgl_tenggat_setor = now() + interval '1 day'
WHERE id = (SELECT id FROM ref WHERE nama = 'k2');

SELECT pg_temp.sebagai('b');
SELECT pg_temp.catat('setor: v1', '1', format('SELECT versi FROM public.setor_karya(%L)', (SELECT id FROM u WHERE nama = 'b') || '/k2/v1.pdf'));
SELECT pg_temp.catat('setor: v2', '2', format('SELECT versi FROM public.setor_karya(%L)', (SELECT id FROM u WHERE nama = 'b') || '/k2/v2.pdf'));
SELECT pg_temp.catat('setor: v3', '3', format('SELECT versi FROM public.setor_karya(%L)', (SELECT id FROM u WHERE nama = 'b') || '/k2/v3.pdf'));
SELECT pg_temp.catat('setor: berkas di folder orang lain ditolak', 'BERKAS_BUKAN_MILIK',
  format('SELECT versi FROM public.setor_karya(%L)', (SELECT id FROM u WHERE nama = 'a') || '/k2/x.pdf'));
SELECT pg_temp.catat('storage: unggah ke folder sendiri', '1',
  format('INSERT INTO storage.objects (bucket_id, name) VALUES (''karya-tulis'', %L) RETURNING 1', (SELECT id FROM u WHERE nama = 'b') || '/k2/v3.pdf'));
SELECT pg_temp.catat('storage: unggah ke folder orang lain ditolak', '42501',
  format('INSERT INTO storage.objects (bucket_id, name) VALUES (''karya-tulis'', %L) RETURNING 1', (SELECT id FROM u WHERE nama = 'a') || '/k2/x.pdf'));
SELECT pg_temp.catat('storage: berkas sendiri tidak bisa ditimpa', '0',
  'WITH x AS (UPDATE storage.objects SET name = name WHERE bucket_id = ''karya-tulis'' RETURNING 1) SELECT count(*) FROM x');
SELECT pg_temp.sebagai('a');
SELECT pg_temp.catat('test 3: anggota kloter lama menyetor latihan di jendela kloter 2', '1',
  format('SELECT versi FROM public.setor_karya(%L)', (SELECT id FROM u WHERE nama = 'a') || '/k2/latihan.pdf'));
SELECT pg_temp.sebagai('c');
SELECT pg_temp.catat('test 4: arsip tidak bisa menyetor', 'BUKAN_SEASON_MILIK',
  format('SELECT versi FROM public.setor_karya(%L)', (SELECT id FROM u WHERE nama = 'c') || '/k2/x.pdf'));
RESET ROLE;

INSERT INTO ref
SELECT CASE WHEN user_id = (SELECT id FROM u WHERE nama = 'a') THEN 'naskah_latihan' ELSE 'naskah_v' || versi END, id
FROM public.writing_submissions WHERE kloter_id = (SELECT id FROM ref WHERE nama = 'k2');
UPDATE public.users SET nama = 'Budi', no_hp = '6281234567890' WHERE id = (SELECT id FROM u WHERE nama = 'b');

SELECT pg_temp.sebagai('mentor');
SELECT pg_temp.catat('test 6: mentor melihat semua naskah', '4', 'SELECT count(*) FROM public.writing_submissions');
SELECT pg_temp.catat('test 6: mentor membuka berkas peserta', '1', 'SELECT count(*) FROM storage.objects WHERE bucket_id = ''karya-tulis''');
SELECT pg_temp.catat('test 9: naskah mengikat hanya versi terakhir', '3',
  format('SELECT string_agg(versi::text, '','') FROM public.naskah_mengikat WHERE kloter_id = %L', (SELECT id FROM ref WHERE nama = 'k2')));
SELECT pg_temp.catat('nilai: sebelum b5 ditolak', 'PENILAIAN_BELUM_DIBUKA',
  format('SELECT status FROM public.nilai_karya(%L, ''{}'')', (SELECT id FROM ref WHERE nama = 'naskah_v3')));
SELECT pg_temp.catat('penulis: mentor melihat nama dan WA penulis selama jendela', 'Budi|6281234567890',
  format('SELECT nama || ''|'' || no_hp FROM public.get_penulis_naskah(%L) WHERE user_id = %L',
    (SELECT id FROM ref WHERE nama = 'k2'), (SELECT id FROM u WHERE nama = 'b')));
SELECT pg_temp.catat('dibaca: mentor menandai naskah yang dibuka', '1',
  format('SELECT count(*) FROM public.tandai_dibaca(%L)', (SELECT id FROM ref WHERE nama = 'naskah_v2')));
SELECT pg_temp.catat('dibaca: menandai ulang tidak gagal', '1',
  format('SELECT count(*) FROM public.tandai_dibaca(%L)', (SELECT id FROM ref WHERE nama = 'naskah_v2')));
SELECT pg_temp.catat('dibaca: tetap satu baris per mentor per naskah', '1',
  format('SELECT count(*) FROM public.naskah_dibaca WHERE submission_id = %L', (SELECT id FROM ref WHERE nama = 'naskah_v2')));
SELECT pg_temp.sebagai('x');
SELECT pg_temp.catat('test 6: peserta lain tidak melihat naskah', '0', 'SELECT count(*) FROM public.writing_submissions');
SELECT pg_temp.catat('test 6: peserta lain tidak membuka berkas', '0', 'SELECT count(*) FROM storage.objects WHERE bucket_id = ''karya-tulis''');
SELECT pg_temp.catat('penulis: peserta tidak bisa melihat data penulis', 'BUKAN_PENILAI',
  format('SELECT count(*) FROM public.get_penulis_naskah(%L)', (SELECT id FROM ref WHERE nama = 'k2')));
SELECT pg_temp.catat('dibaca: peserta tidak bisa menandai', 'BUKAN_PENILAI',
  format('SELECT count(*) FROM public.tandai_dibaca(%L)', (SELECT id FROM ref WHERE nama = 'naskah_v2')));
SELECT pg_temp.catat('dibaca: peserta tidak melihat log baca', '0', 'SELECT count(*) FROM public.naskah_dibaca');
RESET ROLE;

-- ======================================================================
-- Masa penilaian kloter 2
-- ======================================================================
UPDATE public.kloters SET tgl_tenggat_setor = now() - interval '1 second' WHERE id = (SELECT id FROM ref WHERE nama = 'k2');

SELECT pg_temp.sebagai('admin');
SELECT pg_temp.catat('selesaikan: ditolak selama naskah mengikat belum dinilai', 'MASIH_ADA_NASKAH_BELUM_DINILAI',
  format('SELECT status FROM public.ubah_status_kloter(%L, ''selesaikan'')', (SELECT id FROM ref WHERE nama = 'k2')));
SELECT pg_temp.catat('A3b: tutup season ditolak selama ada kloter berjalan', 'MASIH_ADA_KLOTER_BERJALAN',
  format('SELECT terbit FROM public.ubah_status_season(%L, ''tutup'')', (SELECT id FROM ref WHERE nama = 's1')));
SELECT pg_temp.sebagai('b');
SELECT pg_temp.catat('nilai: peserta tidak bisa menilai', 'BUKAN_PENILAI',
  format('SELECT status FROM public.nilai_karya(%L, ''{}'')', (SELECT id FROM ref WHERE nama = 'naskah_v3')));
SELECT pg_temp.sebagai('mentor');
SELECT pg_temp.catat('test 9: versi lama tidak bisa dinilai', 'BUKAN_NASKAH_MENGIKAT',
  format('SELECT status FROM public.nilai_karya(%L, ''{}'')', (SELECT id FROM ref WHERE nama = 'naskah_v1')));
SELECT pg_temp.catat('test 3: naskah latihan tidak bisa dinilai', 'BUKAN_NASKAH_MENGIKAT',
  format('SELECT status FROM public.nilai_karya(%L, ''{}'')', (SELECT id FROM ref WHERE nama = 'naskah_latihan')));
SELECT pg_temp.catat('nilai: versi terakhir setelah b5', 'dinilai',
  format('SELECT status FROM public.nilai_karya(%L, ''{"rubrik":{"konten":"A","bahasa":"B"}}'')', (SELECT id FROM ref WHERE nama = 'naskah_v3')));
SELECT pg_temp.catat('nilai: penilai tercatat', 'true',
  format('SELECT (dinilai_oleh = %L)::text FROM public.penilaian_naskah WHERE submission_id = %L',
    (SELECT id FROM u WHERE nama = 'mentor'), (SELECT id FROM ref WHERE nama = 'naskah_v3')));
SELECT pg_temp.catat('nilai: menilai ulang sebelum kloter ditutup', 'dinilai',
  format('SELECT status FROM public.nilai_karya(%L, ''{"rubrik":{"konten":"B","bahasa":"B"}}'')', (SELECT id FROM ref WHERE nama = 'naskah_v3')));
SELECT pg_temp.catat('nilai: menilai ulang menimpa, tidak menggandakan', '1:B',
  format('SELECT count(*) || '':'' || max(nilai #>> ''{rubrik,konten}'') FROM public.penilaian_naskah WHERE submission_id = %L',
    (SELECT id FROM ref WHERE nama = 'naskah_v3')));
SELECT pg_temp.sebagai('b');
SELECT pg_temp.catat('nilai: penulis tidak bisa membaca nilai sebelum raport', '0', 'SELECT count(*) FROM public.penilaian_naskah');
SELECT pg_temp.sebagai('admin');
SELECT pg_temp.catat('test 3+9: kloter selesai walau ada latihan dan versi lama', 'wrapped',
  format('SELECT status FROM public.ubah_status_kloter(%L, ''selesaikan'')', (SELECT id FROM ref WHERE nama = 'k2')));
SELECT pg_temp.catat('kloter wrapped tidak bisa diubah jadwalnya', '0',
  format('WITH x AS (UPDATE public.kloters SET kapasitas = 10 WHERE id = %L RETURNING 1) SELECT count(*) FROM x', (SELECT id FROM ref WHERE nama = 'k2')));
SELECT pg_temp.sebagai('mentor');
SELECT pg_temp.catat('nilai: setelah kloter ditutup ditolak', 'KLOTER_SUDAH_DITUTUP',
  format('SELECT status FROM public.nilai_karya(%L, ''{}'')', (SELECT id FROM ref WHERE nama = 'naskah_v3')));

-- ======================================================================
-- Peristiwa
-- ======================================================================
SELECT pg_temp.sebagai('b');
SELECT pg_temp.catat('peristiwa: pemilik season melihat livestream', 'livestream',
  format('SELECT string_agg(DISTINCT jenis, '','') FROM public.get_season_peristiwa(%L)', (SELECT id FROM ref WHERE nama = 's1')));
SELECT pg_temp.sebagai('x');
SELECT pg_temp.catat('peristiwa: bukan pemilik ditolak', 'BUKAN_SEASON_MILIK',
  format('SELECT count(*) FROM public.get_season_peristiwa(%L)', (SELECT id FROM ref WHERE nama = 's1')));
RESET ROLE;

-- ---------- laporan ----------
SELECT plan((SELECT count(*)::int FROM hasil));
SELECT is(nilai, harap, label) FROM hasil ORDER BY urut;
SELECT * FROM finish();
ROLLBACK;
