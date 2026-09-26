-- Test 5 (docs/BACKEND.md §8): dua daftarkan_peserta bersamaan untuk kursi terakhir,
-- hanya satu yang lolos. Butuh koneksi sungguhan yang berjalan paralel, jadi pakai dblink;
-- data uji di-commit lewat koneksi `setup` dan dibersihkan di akhir.
-- Kalau tes ini gagal di tengah dan meninggalkan sisa, `supabase db reset`.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;
SET search_path = public, extensions;
SELECT plan(4);

-- dblink menolak jalur tanpa password (127.0.0.1 = trust), jadi sambung lewat alamat server.
CREATE TEMP TABLE cfg AS
SELECT format('host=%s dbname=%s user=postgres password=postgres',
              host(inet_server_addr()), current_database()) AS conn;

SELECT dblink_connect('setup', (SELECT conn FROM cfg));
SELECT dblink_connect('a', (SELECT conn FROM cfg));
SELECT dblink_connect('b', (SELECT conn FROM cfg));

-- Kloter berjalan lain disingkirkan dulu (anti-overlap global), dicatat untuk dipulihkan.
CREATE TEMP TABLE disingkirkan AS
SELECT id FROM dblink('setup', $$
  UPDATE public.kloters SET status = 'draft'
  WHERE status = 'berjalan' AND now() < tgl_tenggat_setor RETURNING id
$$) AS t(id uuid);

CREATE TEMP TABLE uji AS
SELECT * FROM dblink('setup', $$
  WITH s AS (
    INSERT INTO public.seasons (nomor_kaidah, nama, tanggal_mulai, terbit)
    VALUES (990, 'Uji balapan', now() - interval '1 day', true) RETURNING id
  ), k AS (
    INSERT INTO public.kloters (season_id, nomor, kapasitas, status, tanggal_mulai,
      tgl_mulai_orientasi, tgl_mulai_menyimak, tgl_mulai_setor, tgl_tenggat_setor)
    SELECT id, 1, 1, 'berjalan', now() - interval '1 hour', now() + interval '1 day',
      now() + interval '2 days', now() + interval '10 days', now() + interval '20 days' FROM s
    RETURNING id
  ), u AS (
    INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    SELECT gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           n || '@balapan.local', '{}', now(), now()
    FROM unnest(ARRAY['budi', 'sari']) AS n
    RETURNING id, email
  )
  SELECT (SELECT id FROM s), (SELECT id FROM k),
         (SELECT id FROM u WHERE email LIKE 'budi%'), (SELECT id FROM u WHERE email LIKE 'sari%')
$$) AS t(season_id uuid, kloter_id uuid, budi uuid, sari uuid);

-- Keduanya bertindak sebagai server dengan service role (jalur webhook).
SELECT dblink_exec(c, $$SET request.jwt.claims = '{"role":"service_role"}'$$)
FROM unnest(ARRAY['a', 'b']) AS c;

-- A mengambil kursi terakhir tapi belum commit: kunci baris kloter masih dipegang.
SELECT dblink_exec('a', 'BEGIN');
SELECT * FROM dblink('a', format('SELECT jenis FROM public.daftarkan_peserta(%L, %L, %L)',
  (SELECT budi FROM uji), (SELECT season_id FROM uji), 'beli')) AS t(jenis text);

-- B mencoba bersamaan. Tunggu sampai B tertahan kunci atau sudah selesai (maks 5 detik).
CREATE TEMP TABLE pid_b AS SELECT pid FROM dblink('b', 'SELECT pg_backend_pid()') AS t(pid int);
SELECT dblink_send_query('b', format('SELECT jenis FROM public.daftarkan_peserta(%L, %L, %L)',
  (SELECT sari FROM uji), (SELECT season_id FROM uji), 'beli'));

CREATE FUNCTION pg_temp.b_tertahan() RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  FOR i IN 1..50 LOOP
    IF EXISTS (SELECT 1 FROM pg_locks WHERE pid = (SELECT pid FROM pid_b) AND NOT granted) THEN
      RETURN true;
    END IF;
    EXIT WHEN dblink_is_busy('b') = 0;
    PERFORM pg_sleep(0.1);
  END LOOP;
  RETURN false;
END $$;

SELECT ok(pg_temp.b_tertahan(), 'test 5: pendaftar kedua menunggu kunci kloter');

SELECT dblink_exec('a', 'COMMIT');

-- Kalau B error, dblink_get_result mengembalikan nol baris; pesannya diambil terpisah.
CREATE TEMP TABLE hasil_b AS SELECT jenis FROM dblink_get_result('b', false) AS t(jenis text);
CREATE TEMP TABLE pesan_b AS SELECT dblink_error_message('b') AS pesan;
SELECT * FROM dblink_get_result('b', false) AS t(jenis text);  -- tutup antrean hasil async

SELECT is((SELECT count(*)::int FROM hasil_b), 0, 'test 5: pendaftar kedua tidak mendapat kursi');
SELECT matches((SELECT pesan FROM pesan_b), 'Kloter penuh', 'test 5: pendaftar kedua ditolak "Kloter penuh"');
SELECT is((SELECT count(*)::int FROM user_seasons WHERE kloter_daftar_id = (SELECT kloter_id FROM uji)), 1,
  'test 5: kloter berisi tepat satu peserta');

-- ---------- bersih-bersih (data uji sudah di-commit) ----------
SELECT dblink_exec('setup', format($$
  DELETE FROM public.user_seasons WHERE season_id = %1$L;
  DELETE FROM public.kloters WHERE season_id = %1$L;
  DELETE FROM public.seasons WHERE id = %1$L;
  DELETE FROM auth.users WHERE id IN (%2$L, %3$L);
  UPDATE public.kloters SET status = 'berjalan' WHERE id = ANY (%4$L::uuid[]);
$$, (SELECT season_id FROM uji), (SELECT budi FROM uji), (SELECT sari FROM uji),
    (SELECT array_agg(id) FROM disingkirkan)));
SELECT dblink_disconnect(c) FROM unnest(ARRAY['setup', 'a', 'b']) AS c;

SELECT * FROM finish();
ROLLBACK;
