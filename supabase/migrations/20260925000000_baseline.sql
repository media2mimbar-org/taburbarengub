-- ============================================================
-- Baseline TaburBarengUB — menggantikan 18 migrasi 27 Jul – 31 Agt 2026.
--
-- Sumber kebenaran desain: docs/BACKEND.md (revisi 25 Sep 2026).
-- Rujukan § di komentar menunjuk ke dokumen itu.
--
-- Kaidah (§2.4):
--   invarian   → constraint, ketat
--   kebijakan  → satu fungsi bernama di app_internal (plug-in)
-- Kaidah jalur tulis (§3.10):
--   aturan per baris        → admin tulis langsung, dijaga RLS + constraint
--   aturan lintas baris/tabel → RPC
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS app_internal;
GRANT USAGE ON SCHEMA app_internal TO authenticated, anon, service_role;

-- Hak dasar Supabase untuk objek baru di public (sama dengan baseline Fase 1).
-- Pembatasan dilakukan per tabel/kolom di bagian 6, dan per RPC di bagian 5.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES    TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- ============================================================
-- 1. TABEL
-- ============================================================

-- ---------- Pengguna & kajian offline -----------------------

CREATE TABLE public.users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama           text,
  nama_panggilan text,
  email          text NOT NULL UNIQUE,
  no_hp          text,
  jenis_kelamin  text CHECK (jenis_kelamin IN ('ikhwan', 'akhwat')),
  tanggal_lahir  date CHECK (tanggal_lahir IS NULL OR (tanggal_lahir <= CURRENT_DATE AND tanggal_lahir >= DATE '1900-01-01')),
  profesi        text,
  domisili       text,
  role           text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'mentor', 'staff')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.hero_content (
  id                integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  judul_acara       text NOT NULL DEFAULT 'Tabur Bareng UB',
  filosofi_tabur    text,
  tagline           text,
  nama_pemateri     text,
  bio_pemateri      text,
  foto_pemateri_url text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------- Season & kloter ---------------------------------

-- §3.2 D1: status siklus hidup diturunkan (status_siklus), yang disimpan hanya
-- keputusan editorial `terbit`.
CREATE TABLE public.seasons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_kaidah    integer NOT NULL,
  nama            text NOT NULL,
  tanggal_mulai   timestamptz NOT NULL,
  tanggal_selesai timestamptz,
  terbit          boolean NOT NULL DEFAULT false,
  CONSTRAINT selesai_setelah_mulai CHECK (tanggal_selesai IS NULL OR tanggal_selesai >= tanggal_mulai)
);

-- §3.2: lima batas b1–b5, bukan rentang per fase.
CREATE TABLE public.kloters (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id           uuid NOT NULL REFERENCES public.seasons(id),
  nomor               integer NOT NULL,
  kapasitas           integer NOT NULL CHECK (kapasitas > 0),
  status              text NOT NULL DEFAULT 'draft',
  tanggal_mulai       timestamptz NOT NULL,  -- b1: pendaftaran buka
  tgl_mulai_orientasi timestamptz NOT NULL,  -- b2
  tgl_mulai_menyimak  timestamptz NOT NULL,  -- b3: ambang video
  tgl_mulai_setor     timestamptz NOT NULL,  -- b4: jendela setor buka
  tgl_tenggat_setor   timestamptz NOT NULL,  -- b5: jendela setor tutup
  tanggal_selesai     timestamptz,
  target_penilaian    timestamptz,
  ambang_pengingat    interval NOT NULL DEFAULT interval '3 days',
  livestream_url      text,
  livestream_at       timestamptz,
  UNIQUE (season_id, nomor),
  UNIQUE (id, season_id),  -- target FK komposit user_seasons
  CONSTRAINT status_valid CHECK (status IN ('draft', 'berjalan', 'wrapped')),
  -- D5: ketat, kecuali orientasi boleh berdurasi nol.
  CONSTRAINT urutan_tanggal_valid CHECK (
    tanggal_mulai       <  tgl_mulai_orientasi AND
    tgl_mulai_orientasi <= tgl_mulai_menyimak  AND
    tgl_mulai_menyimak  <  tgl_mulai_setor     AND
    tgl_mulai_setor     <  tgl_tenggat_setor
  ),
  CONSTRAINT selesai_setelah_tenggat CHECK (tanggal_selesai IS NULL OR tanggal_selesai >= tgl_tenggat_setor),
  CONSTRAINT wrapped_menutup CHECK ((status = 'wrapped') = (tanggal_selesai IS NOT NULL)),
  CONSTRAINT ambang_pengingat_positif CHECK (ambang_pengingat > interval '0'),
  -- D3: yang dikunci hanya bagian berjadwal [b1, b5); draft dikecualikan supaya
  -- panitia bisa menyiapkan jadwal tentatif yang tumpang tindih.
  CONSTRAINT kloter_tidak_overlap EXCLUDE USING gist (
    tstzrange(tanggal_mulai, tgl_tenggat_setor, '[)') WITH &&
  ) WHERE (status <> 'draft')
);

CREATE TABLE public.kelas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id          uuid NOT NULL REFERENCES public.seasons(id),
  nomor              integer NOT NULL,
  judul              text NOT NULL,
  video_url          text,
  jumlah_soal_tampil smallint NOT NULL DEFAULT 5 CHECK (jumlah_soal_tampil BETWEEN 1 AND 20),
  UNIQUE (season_id, nomor)
);

-- §3.2: bank soal per video. Isi beku setelah dibuat; hanya `aktif` yang boleh
-- diubah langsung, `kunci` hanya lewat koreksi_kunci.
CREATE TABLE public.soal (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas_id   uuid NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  pertanyaan text NOT NULL,
  pilihan    jsonb NOT NULL,
  kunci      smallint NOT NULL,
  aktif      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kunci_menunjuk_pilihan CHECK (
    CASE WHEN jsonb_typeof(pilihan) = 'array'
         THEN kunci >= 0 AND kunci < jsonb_array_length(pilihan)
         ELSE false
    END
  )
);

CREATE TABLE public.kloter_mentors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kloter_id  uuid NOT NULL REFERENCES public.kloters(id) ON DELETE CASCADE,
  mentor_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kloter_id, mentor_id)
);

-- §3.7: `jenis` adalah sumber, kloter kosong akibatnya.
CREATE TABLE public.user_seasons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id),
  season_id         uuid NOT NULL REFERENCES public.seasons(id),
  kloter_daftar_id  uuid,
  jenis             text NOT NULL CHECK (jenis IN ('bimbingan', 'arsip')),
  sumber            text NOT NULL CHECK (sumber IN ('beli', 'gratis')),
  tanggal_diperoleh timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id),
  CONSTRAINT arsip_tanpa_kloter CHECK ((jenis = 'arsip') = (kloter_daftar_id IS NULL)),
  -- kloter asal harus milik season yang sama
  CONSTRAINT kloter_daftar_se_season FOREIGN KEY (kloter_daftar_id, season_id)
    REFERENCES public.kloters(id, season_id)
);

-- §3.2: bekas video_progress. `skor` = jumlah benar, penyebut = cardinality(soal_terpilih).
CREATE TABLE public.kuis_peserta (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id),
  kelas_id      uuid NOT NULL REFERENCES public.kelas(id),
  soal_terpilih uuid[] NOT NULL DEFAULT '{}',
  jawaban_soal  jsonb,
  skor          integer,
  UNIQUE (user_id, kelas_id)
);

-- D6: kloter_id = kloter yang jendelanya terbuka saat setor.
CREATE TABLE public.writing_submissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id),
  kloter_id  uuid NOT NULL REFERENCES public.kloters(id),
  versi      integer NOT NULL DEFAULT 1,
  file_url   text NOT NULL,
  status     text NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'dinilai')),
  nilai      jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kloter_id, versi)
);

COMMENT ON COLUMN public.writing_submissions.file_url IS
  'Path objek di bucket privat karya-tulis: {user_id}/{kloter_id}/{nama}. Signed URL dibuat Storage API.';

-- Tertahan §4.1: bentuk raport belum ditetapkan tim media.
CREATE TABLE public.certificates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id),
  user_season_id uuid NOT NULL REFERENCES public.user_seasons(id),
  jenis          text NOT NULL CHECK (jenis IN ('lulus', 'ikut_serta')),
  nama_penerima  text NOT NULL,
  issued_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_sesi         text NOT NULL CONSTRAINT nama_sesi_tidak_kosong CHECK (length(btrim(nama_sesi)) > 0),
  tanggal_waktu     timestamptz NOT NULL,
  lokasi_atau_link  text,
  deskripsi         text,
  kapasitas         integer NOT NULL CHECK (kapasitas > 0),
  kuota_terisi      integer NOT NULL DEFAULT 0 CHECK (kuota_terisi >= 0),
  kapasitas_kids    integer NOT NULL DEFAULT 0 CHECK (kapasitas_kids >= 0),
  kuota_kids_terisi integer NOT NULL DEFAULT 0 CHECK (kuota_kids_terisi >= 0),
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  kloter_id         uuid REFERENCES public.kloters(id),
  rekaman_url       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kuota_tidak_lebih_kapasitas CHECK (kuota_terisi <= kapasitas)
);

CREATE TABLE public.bookings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL REFERENCES public.event_sessions(id) ON DELETE CASCADE,
  qr_token      text NOT NULL UNIQUE,
  jumlah_anak   integer NOT NULL DEFAULT 0 CHECK (jumlah_anak BETWEEN 0 AND 5),
  status        text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'checked_in', 'cancelled')),
  checked_in_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_per_session UNIQUE (user_id, session_id)
);

-- Indeks FK (kepatuhan 0 unindexed FK) dan kolom yang sering disaring.
CREATE INDEX idx_kloters_season_id            ON public.kloters (season_id);
CREATE INDEX idx_kelas_season_id              ON public.kelas (season_id);
CREATE INDEX idx_soal_kelas_id                ON public.soal (kelas_id);
CREATE INDEX idx_kloter_mentors_mentor_id     ON public.kloter_mentors (mentor_id);
CREATE INDEX idx_user_seasons_season_id       ON public.user_seasons (season_id);
CREATE INDEX idx_user_seasons_kloter_daftar   ON public.user_seasons (kloter_daftar_id, season_id);
CREATE INDEX idx_kuis_peserta_kelas_id        ON public.kuis_peserta (kelas_id);
CREATE INDEX idx_writing_submissions_kloter   ON public.writing_submissions (kloter_id);
CREATE INDEX idx_certificates_user_id         ON public.certificates (user_id);
CREATE INDEX idx_certificates_user_season_id  ON public.certificates (user_season_id);
CREATE INDEX idx_event_sessions_kloter_id     ON public.event_sessions (kloter_id);
CREATE INDEX idx_event_sessions_status        ON public.event_sessions (status);
CREATE INDEX idx_event_sessions_tanggal       ON public.event_sessions (tanggal_waktu);
CREATE INDEX idx_bookings_session             ON public.bookings (session_id);


-- ============================================================
-- 2. FUNGSI INTERNAL (app_internal) — helper peran & plug-in
-- ============================================================

CREATE FUNCTION app_internal.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND u.role = 'admin');
$$;

CREATE FUNCTION app_internal.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'staff'));
$$;

-- Admin atau mentor. Dipakai untuk melihat data pendaftaran di antrean penilaian.
CREATE FUNCTION app_internal.is_penilai() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'mentor'));
$$;

-- PLUG-IN §3.9: siapa penilai naskah ini. Isi sekarang: semua mentor, semua naskah
-- (D4 di-hold). Ganti isi fungsi ini saat penugasan naskah diputuskan; ketiga
-- pemanggilnya (policy storage, policy writing_submissions, nilai_karya) tidak disentuh.
CREATE FUNCTION app_internal.boleh_menilai_naskah(p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_internal.is_penilai();
$$;

-- PLUG-IN §3.2: jendela kuis kloter. Isi sekarang: hanya selama fase menyimak [b3, b4).
CREATE FUNCTION app_internal.status_jendela_kuis(p_kloter_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((
    SELECT CASE
      WHEN k.status <> 'berjalan'          THEN 'tutup'
      WHEN now() < k.tgl_mulai_menyimak    THEN 'belum_buka'
      WHEN now() < k.tgl_mulai_setor       THEN 'terbuka'
      ELSE                                      'tutup'
    END
    FROM public.kloters k
    WHERE k.id = p_kloter_id
  ), 'tutup');
$$;

-- Jumlah jawaban benar. Satu-satunya tempat menghitung benar/salah; dipakai
-- jawab_kuis dan koreksi_kunci.
CREATE FUNCTION app_internal.hitung_skor_kuis(p_soal_terpilih uuid[], p_jawaban jsonb) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer
  FROM public.soal s
  WHERE s.id = ANY (p_soal_terpilih)
    AND p_jawaban -> (s.id::text) = to_jsonb(s.kunci);
$$;

-- PLUG-IN §3.6: angka nilai kuis di raport, 0–100. Isi sekarang: rumus tim
-- (total benar ÷ total soal). Total soal per kelas = soal yang diundi kalau kuis
-- sudah dibuka, atau jumlah_soal_tampil saat ini kalau belum.
CREATE FUNCTION app_internal.hitung_nilai_kuis(p_user_season_id uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH us AS (
    SELECT user_id, season_id FROM public.user_seasons WHERE id = p_user_season_id
  ), per_kelas AS (
    SELECT coalesce(kp.skor, 0) AS benar,
           CASE WHEN cardinality(kp.soal_terpilih) > 0
                THEN cardinality(kp.soal_terpilih)
                ELSE k.jumlah_soal_tampil
           END AS total
    FROM us
    JOIN public.kelas k ON k.season_id = us.season_id
    LEFT JOIN public.kuis_peserta kp ON kp.kelas_id = k.id AND kp.user_id = us.user_id
  )
  SELECT CASE WHEN coalesce(sum(total), 0) = 0 THEN 0
              ELSE round(100.0 * sum(benar) / sum(total), 2)
         END
  FROM per_kelas;
$$;

CREATE FUNCTION app_internal.guard_tanggal_sesi() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF new.status = 'published' AND new.tanggal_waktu <= now() THEN
    RAISE EXCEPTION 'tidak bisa menerbitkan sesi yang sudah lewat'
      USING errcode = 'TB104', hint = 'SESI_SUDAH_LEWAT';
  END IF;
  RETURN new;
END;
$$;

CREATE FUNCTION app_internal.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_nama text;
  v_nama_panggilan text;
  v_no_hp text;
  v_jenis_kelamin text;
  v_tanggal_lahir date;
  v_profesi text;
  v_domisili text;
BEGIN
  v_nama := nullif(trim(coalesce(new.raw_user_meta_data->>'nama', '')), '');
  v_nama_panggilan := nullif(trim(coalesce(new.raw_user_meta_data->>'nama_panggilan', '')), '');
  v_no_hp := nullif(trim(coalesce(new.raw_user_meta_data->>'no_hp', '')), '');
  v_jenis_kelamin := nullif(trim(coalesce(new.raw_user_meta_data->>'jenis_kelamin', '')), '');
  v_profesi := nullif(trim(coalesce(new.raw_user_meta_data->>'profesi', '')), '');
  v_domisili := nullif(trim(coalesce(new.raw_user_meta_data->>'domisili', '')), '');

  IF v_jenis_kelamin IS NOT NULL AND v_jenis_kelamin NOT IN ('ikhwan', 'akhwat') THEN
    v_jenis_kelamin := NULL;
  END IF;

  IF v_no_hp IS NOT NULL AND v_no_hp ~ '^(\+62|62|0)8[0-9]{8,12}$' THEN
    IF v_no_hp ~ '^\+62' THEN
      v_no_hp := substring(v_no_hp FROM 2);
    ELSIF v_no_hp ~ '^08' THEN
      v_no_hp := '62' || substring(v_no_hp FROM 2);
    END IF;
  ELSE
    v_no_hp := NULL;
  END IF;

  BEGIN
    v_tanggal_lahir := nullif(new.raw_user_meta_data->>'tanggal_lahir', '')::date;
    IF v_tanggal_lahir > current_date OR v_tanggal_lahir < '1900-01-01' THEN
      v_tanggal_lahir := NULL;
    END IF;
  EXCEPTION WHEN others THEN
    v_tanggal_lahir := NULL;
  END;

  INSERT INTO public.users (id, nama, nama_panggilan, email, no_hp, jenis_kelamin, tanggal_lahir, profesi, domisili)
  VALUES (new.id, v_nama, v_nama_panggilan, new.email, v_no_hp, v_jenis_kelamin, v_tanggal_lahir, v_profesi, v_domisili)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Event trigger: aktifkan RLS otomatis pada tabel public baru.
CREATE FUNCTION app_internal.rls_auto_enable() RETURNS event_trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name = 'public' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'rls_auto_enable: gagal mengaktifkan RLS pada %', cmd.object_identity;
      END;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_internal FROM PUBLIC;
-- Dipanggil policy RLS yang dievaluasi sebagai peminta; anon ikut karena policy publik memakai is_admin().
GRANT EXECUTE ON FUNCTION app_internal.is_admin()                  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_internal.is_staff()                  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_internal.is_penilai()                TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_internal.boleh_menilai_naskah(text)  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_internal.rls_auto_enable()           TO service_role;


-- ============================================================
-- 3. TURUNAN: status season dan dua view (§3.3, §3.5)
-- ============================================================

-- Computed field PostgREST: `seasons?select=*,status_siklus`. UI membaca status dari sini (§2.4).
CREATE FUNCTION public.status_siklus(s public.seasons) RETURNS text
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN NOT s.terbit                                         THEN 'draft'
    WHEN now() < s.tanggal_mulai                              THEN 'akan_datang'
    WHEN s.tanggal_selesai IS NOT NULL AND now() >= s.tanggal_selesai THEN 'selesai'
    ELSE 'berjalan'
  END;
$$;

REVOKE ALL ON FUNCTION public.status_siklus(public.seasons) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.status_siklus(public.seasons) TO anon, authenticated, service_role;

-- B1: unik by construction berkat GiST parsial [b1, b5); tanpa LIMIT.
-- livestream_url sengaja tidak ikut (kolom rahasia, §3.10).
CREATE VIEW public.kloter_dalam_fase WITH (security_invoker = true) AS
SELECT k.id, k.season_id, k.nomor, k.kapasitas, k.status,
       k.tanggal_mulai, k.tgl_mulai_orientasi, k.tgl_mulai_menyimak,
       k.tgl_mulai_setor, k.tgl_tenggat_setor, k.ambang_pengingat, k.livestream_at,
       CASE
         WHEN now() < k.tgl_mulai_orientasi THEN 'pendaftaran'
         WHEN now() < k.tgl_mulai_menyimak  THEN 'orientasi'
         WHEN now() < k.tgl_mulai_setor     THEN 'menyimak'
         ELSE                                    'menulis_setor'
       END AS fase
FROM public.kloters k
JOIN public.seasons s ON s.id = k.season_id
WHERE k.status = 'berjalan'
  AND now() >= k.tanggal_mulai
  AND now() <  k.tgl_tenggat_setor
  AND public.status_siklus(s) = 'berjalan';

-- §3.5: versi terakhir per peserta di kloter asalnya. Satu tempat untuk aturan ini.
CREATE VIEW public.naskah_mengikat WITH (security_invoker = true) AS
SELECT DISTINCT ON (ws.user_id, ws.kloter_id) ws.*
FROM public.writing_submissions ws
JOIN public.user_seasons us
  ON us.user_id = ws.user_id
 AND us.kloter_daftar_id = ws.kloter_id
ORDER BY ws.user_id, ws.kloter_id, ws.versi DESC;


-- ============================================================
-- 4. RPC ZONA A — peserta
-- ============================================================

CREATE FUNCTION public.create_booking(p_session_id uuid, p_jumlah_anak integer DEFAULT 0)
RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session public.event_sessions;
  v_booking public.bookings;
  v_user public.users;
  v_anak integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'auth required' USING errcode = '28000', hint = 'AUTH_DIPERLUKAN';
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = (SELECT auth.uid());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile tidak ditemukan' USING errcode = 'P0002', hint = 'USER_TIDAK_DITEMUKAN';
  END IF;

  IF v_user.no_hp IS NULL OR nullif(trim(v_user.no_hp), '') IS NULL THEN
    RAISE EXCEPTION 'Nomor WhatsApp wajib diisi sebelum memesan tiket'
      USING errcode = 'TB109', hint = 'NO_HP_DIPERLUKAN';
  END IF;

  v_anak := coalesce(p_jumlah_anak, 0);
  IF v_anak < 0 OR v_anak > 5 THEN
    RAISE EXCEPTION 'Jumlah anak harus antara 0 sampai 5' USING errcode = 'TB107', hint = 'BATAS_ANAK_TIDAK_VALID';
  END IF;

  SELECT * INTO v_session FROM public.event_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR v_session.status <> 'published' THEN
    RAISE EXCEPTION 'sesi tidak ditemukan' USING errcode = 'TB101', hint = 'SESI_TIDAK_DITEMUKAN';
  END IF;

  IF v_session.tanggal_waktu <= now() THEN
    RAISE EXCEPTION 'sesi sudah lewat' USING errcode = 'TB104', hint = 'SESI_SUDAH_LEWAT';
  END IF;

  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.user_id = (SELECT auth.uid()) AND b.session_id = p_session_id) THEN
    RAISE EXCEPTION 'sudah booking sesi ini' USING errcode = 'TB105', hint = 'BOOKING_DUPLIKAT';
  END IF;

  IF v_session.kuota_terisi >= v_session.kapasitas THEN
    RAISE EXCEPTION 'kuota penuh' USING errcode = 'TB103', hint = 'SESI_KUOTA_PENUH';
  END IF;

  IF v_anak > 0 AND (v_session.kuota_kids_terisi + v_anak) > v_session.kapasitas_kids THEN
    RAISE EXCEPTION 'kuota kids corner penuh' USING errcode = 'TB108', hint = 'KIDS_CORNER_PENUH';
  END IF;

  UPDATE public.event_sessions
  SET kuota_terisi = kuota_terisi + 1,
      kuota_kids_terisi = kuota_kids_terisi + v_anak
  WHERE id = p_session_id;

  INSERT INTO public.bookings (user_id, session_id, qr_token, jumlah_anak)
  VALUES ((SELECT auth.uid()), p_session_id, encode(extensions.gen_random_bytes(32), 'hex'), v_anak)
  RETURNING * INTO v_booking;

  RETURN v_booking;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'sudah booking sesi ini' USING errcode = 'TB105', hint = 'BOOKING_DUPLIKAT';
END;
$$;

CREATE FUNCTION public.update_profile(
  p_nama text DEFAULT NULL,
  p_nama_panggilan text DEFAULT NULL,
  p_no_hp text DEFAULT NULL,
  p_jenis_kelamin text DEFAULT NULL,
  p_tanggal_lahir date DEFAULT NULL,
  p_profesi text DEFAULT NULL,
  p_domisili text DEFAULT NULL
) RETURNS public.users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user public.users;
  v_clean_no_hp text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'auth required' USING errcode = '28000', hint = 'AUTH_DIPERLUKAN';
  END IF;

  IF p_jenis_kelamin IS NOT NULL AND p_jenis_kelamin NOT IN ('ikhwan', 'akhwat') THEN
    RAISE EXCEPTION 'Jenis kelamin tidak valid, harus ikhwan atau akhwat'
      USING errcode = '22000', hint = 'JENIS_KELAMIN_TIDAK_VALID';
  END IF;

  IF p_tanggal_lahir IS NOT NULL AND (p_tanggal_lahir > current_date OR p_tanggal_lahir < '1900-01-01') THEN
    RAISE EXCEPTION 'Tanggal lahir tidak valid' USING errcode = '22000', hint = 'TANGGAL_LAHIR_TIDAK_VALID';
  END IF;

  IF p_no_hp IS NOT NULL AND trim(p_no_hp) <> '' THEN
    v_clean_no_hp := trim(p_no_hp);
    IF v_clean_no_hp !~ '^(\+62|62|0)8[0-9]{8,12}$' THEN
      RAISE EXCEPTION 'Format nomor WhatsApp tidak valid (contoh: 08123456789)'
        USING errcode = '22000', hint = 'FORMAT_NO_HP_TIDAK_VALID';
    END IF;
    IF v_clean_no_hp ~ '^\+62' THEN
      v_clean_no_hp := substring(v_clean_no_hp FROM 2);
    ELSIF v_clean_no_hp ~ '^08' THEN
      v_clean_no_hp := '62' || substring(v_clean_no_hp FROM 2);
    END IF;
  ELSE
    v_clean_no_hp := NULL;
  END IF;

  UPDATE public.users
  SET nama           = coalesce(nullif(trim(p_nama), ''), nama),
      nama_panggilan = coalesce(nullif(trim(p_nama_panggilan), ''), nama_panggilan),
      no_hp          = coalesce(v_clean_no_hp, no_hp),
      jenis_kelamin  = coalesce(p_jenis_kelamin, jenis_kelamin),
      tanggal_lahir  = coalesce(p_tanggal_lahir, tanggal_lahir),
      profesi        = coalesce(nullif(trim(p_profesi), ''), profesi),
      domisili       = coalesce(nullif(trim(p_domisili), ''), domisili)
  WHERE id = (SELECT auth.uid())
  RETURNING * INTO v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile tidak ditemukan' USING errcode = 'P0002', hint = 'USER_TIDAK_DITEMUKAN';
  END IF;

  RETURN v_user;
END;
$$;

-- Jendela setor: [b4, b5) milik kloter dalam fase. Naskah dicatat ke kloter itu (D6).
CREATE FUNCTION public.setor_karya(p_file_url text) RETURNS public.writing_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id    uuid := (SELECT auth.uid());
  v_kloter     record;
  v_versi      integer;
  v_path       text;
  v_hasil      public.writing_submissions;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Belum masuk' USING errcode = '28000', hint = 'BELUM_MASUK';
  END IF;

  v_path := trim(coalesce(p_file_url, ''));
  IF v_path ~ '\.\.' OR v_path !~ '^[\w\-/.]+\.(docx|doc|pdf)$' THEN
    RAISE EXCEPTION 'Format berkas harus .docx, .doc, atau .pdf'
      USING errcode = '22000', hint = 'FORMAT_FILE_TIDAK_VALID';
  END IF;

  -- Path harus di folder milik penyetor; mencegah mengklaim berkas orang lain.
  IF split_part(v_path, '/', 1) <> v_user_id::text THEN
    RAISE EXCEPTION 'Berkas bukan milikmu' USING errcode = '42501', hint = 'BERKAS_BUKAN_MILIK';
  END IF;

  SELECT id, season_id, fase INTO v_kloter FROM public.kloter_dalam_fase;
  IF NOT FOUND OR v_kloter.fase <> 'menulis_setor' THEN
    RAISE EXCEPTION 'Jendela setor sedang tutup' USING errcode = '22000', hint = 'JENDELA_SETOR_TERTUTUP';
  END IF;

  PERFORM 1 FROM public.user_seasons
  WHERE user_id = v_user_id AND season_id = v_kloter.season_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bukan season milikmu yang sedang berjalan'
      USING errcode = '42501', hint = 'BUKAN_SEASON_MILIK';
  END IF;

  SELECT coalesce(max(versi), 0) + 1 INTO v_versi
  FROM public.writing_submissions
  WHERE user_id = v_user_id AND kloter_id = v_kloter.id;

  INSERT INTO public.writing_submissions (user_id, kloter_id, versi, file_url)
  VALUES (v_user_id, v_kloter.id, v_versi, v_path)
  RETURNING * INTO v_hasil;

  RETURN v_hasil;
END;
$$;

-- Video = ambang (§3.4): bimbingan sejak b3 kloter asal, arsip langsung, admin selalu.
CREATE FUNCTION public.get_video_url(p_kelas_id uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url       text;
  v_season_id uuid;
  v_us        public.user_seasons;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT season_id, video_url INTO v_season_id, v_url FROM public.kelas WHERE id = p_kelas_id;
  IF NOT FOUND OR v_url IS NULL THEN
    RETURN NULL;
  END IF;

  IF app_internal.is_admin() THEN
    RETURN v_url;
  END IF;

  SELECT * INTO v_us FROM public.user_seasons
  WHERE user_id = (SELECT auth.uid()) AND season_id = v_season_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_us.jenis = 'arsip' THEN
    RETURN v_url;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.kloters k
    WHERE k.id = v_us.kloter_daftar_id
      AND k.status <> 'draft'
      AND now() >= k.tgl_mulai_menyimak
  ) THEN
    RETURN v_url;
  END IF;

  RETURN NULL;
END;
$$;

-- Pemeriksaan bersama get_soal_kelas / jawab_kuis: peserta bimbingan + jendela terbuka.
-- Mengembalikan kloter asal.
CREATE FUNCTION app_internal.gerbang_kuis(p_kelas_id uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_season_id uuid;
  v_us        public.user_seasons;
  v_jendela   text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Belum masuk' USING errcode = '28000', hint = 'BELUM_MASUK';
  END IF;

  SELECT season_id INTO v_season_id FROM public.kelas WHERE id = p_kelas_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kelas tidak ditemukan' USING errcode = 'P0002', hint = 'KELAS_TIDAK_DITEMUKAN';
  END IF;

  SELECT * INTO v_us FROM public.user_seasons
  WHERE user_id = (SELECT auth.uid()) AND season_id = v_season_id;
  IF NOT FOUND OR v_us.jenis <> 'bimbingan' THEN
    RAISE EXCEPTION 'Kuis hanya untuk peserta bimbingan season ini'
      USING errcode = '42501', hint = 'BUKAN_PESERTA_BIMBINGAN';
  END IF;

  v_jendela := app_internal.status_jendela_kuis(v_us.kloter_daftar_id);
  IF v_jendela = 'belum_buka' THEN
    RAISE EXCEPTION 'Kuis belum dibuka' USING errcode = '55000', hint = 'KUIS_BELUM_BUKA';
  ELSIF v_jendela <> 'terbuka' THEN
    RAISE EXCEPTION 'Kuis sudah ditutup' USING errcode = '55000', hint = 'KUIS_TUTUP';
  END IF;

  RETURN v_us.kloter_daftar_id;
END;
$$;

REVOKE ALL ON FUNCTION app_internal.gerbang_kuis(uuid) FROM PUBLIC;

-- Menyajikan soal tanpa kunci. Undian dikunci saat pertama dipanggil.
CREATE FUNCTION public.get_soal_kelas(p_kelas_id uuid)
RETURNS TABLE (id uuid, pertanyaan text, pilihan jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_row     public.kuis_peserta;
  v_tampil  smallint;
  v_undian  uuid[];
BEGIN
  PERFORM app_internal.gerbang_kuis(p_kelas_id);

  SELECT * INTO v_row FROM public.kuis_peserta kp
  WHERE kp.user_id = v_user_id AND kp.kelas_id = p_kelas_id;

  IF NOT FOUND THEN
    SELECT k.jumlah_soal_tampil INTO v_tampil FROM public.kelas k WHERE k.id = p_kelas_id;

    -- Bank kurang → jangan mengundi; undian yang terkunci dengan soal kurang itu permanen.
    IF (SELECT count(*) FROM public.soal s WHERE s.kelas_id = p_kelas_id AND s.aktif) < v_tampil THEN
      RAISE EXCEPTION 'Kuis belum tersedia' USING errcode = '55000', hint = 'KUIS_BELUM_TERSEDIA';
    END IF;

    SELECT array_agg(u.id) INTO v_undian
    FROM (
      SELECT s.id FROM public.soal s
      WHERE s.kelas_id = p_kelas_id AND s.aktif
      ORDER BY random()
      LIMIT v_tampil
    ) u;

    -- Dua pembukaan bersamaan: yang kalah memakai undian pemenang.
    INSERT INTO public.kuis_peserta (user_id, kelas_id, soal_terpilih)
    VALUES (v_user_id, p_kelas_id, v_undian)
    ON CONFLICT (user_id, kelas_id) DO NOTHING;

    SELECT * INTO v_row FROM public.kuis_peserta kp
    WHERE kp.user_id = v_user_id AND kp.kelas_id = p_kelas_id;
  END IF;

  RETURN QUERY
  SELECT s.id, s.pertanyaan, s.pilihan
  FROM unnest(v_row.soal_terpilih) WITH ORDINALITY AS u(soal_id, urutan)
  JOIN public.soal s ON s.id = u.soal_id
  ORDER BY u.urutan;
END;
$$;

-- Sekali kirim, final. p_jawaban = { "<soal_id>": <indeks pilihan>, ... }
CREATE FUNCTION public.jawab_kuis(p_kelas_id uuid, p_jawaban jsonb) RETURNS public.kuis_peserta
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.kuis_peserta;
BEGIN
  PERFORM app_internal.gerbang_kuis(p_kelas_id);

  SELECT * INTO v_row FROM public.kuis_peserta
  WHERE user_id = (SELECT auth.uid()) AND kelas_id = p_kelas_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buka kuis dulu sebelum menjawab' USING errcode = '55000', hint = 'KUIS_BELUM_DIBUKA';
  END IF;

  IF v_row.jawaban_soal IS NOT NULL THEN
    RAISE EXCEPTION 'Kuis kelas ini sudah dijawab dan tidak bisa diubah'
      USING errcode = '55000', hint = 'KUIS_SUDAH_DIJAWAB';
  END IF;

  IF jsonb_typeof(p_jawaban) IS DISTINCT FROM 'object'
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(p_jawaban) AS kunci_jawaban
       WHERE kunci_jawaban NOT IN (SELECT unnest(v_row.soal_terpilih)::text)
     ) THEN
    RAISE EXCEPTION 'Jawaban tidak sesuai soal yang diberikan'
      USING errcode = '22000', hint = 'JAWABAN_TIDAK_VALID';
  END IF;

  UPDATE public.kuis_peserta
  SET jawaban_soal = p_jawaban,
      skor = app_internal.hitung_skor_kuis(v_row.soal_terpilih, p_jawaban)
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Status kuis 6 kelas untuk layar; UI tidak menghitung gerbang sendiri (§2.4).
CREATE FUNCTION public.get_status_kuis(p_season_id uuid)
RETURNS TABLE (kelas_id uuid, nomor integer, status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_us public.user_seasons;
BEGIN
  SELECT * INTO v_us FROM public.user_seasons
  WHERE user_id = (SELECT auth.uid()) AND season_id = p_season_id;
  IF NOT FOUND OR v_us.jenis <> 'bimbingan' THEN
    RAISE EXCEPTION 'Kuis hanya untuk peserta bimbingan season ini'
      USING errcode = '42501', hint = 'BUKAN_PESERTA_BIMBINGAN';
  END IF;

  RETURN QUERY
  SELECT k.id, k.nomor,
         CASE
           WHEN kp.jawaban_soal IS NOT NULL THEN 'sudah_dijawab'
           WHEN app_internal.status_jendela_kuis(v_us.kloter_daftar_id) <> 'terbuka'
             THEN app_internal.status_jendela_kuis(v_us.kloter_daftar_id)
           WHEN kp.id IS NULL
                AND (SELECT count(*) FROM public.soal s WHERE s.kelas_id = k.id AND s.aktif) < k.jumlah_soal_tampil
             THEN 'belum_tersedia'
           ELSE 'terbuka'
         END
  FROM public.kelas k
  LEFT JOIN public.kuis_peserta kp ON kp.kelas_id = k.id AND kp.user_id = v_us.user_id
  WHERE k.season_id = p_season_id
  ORDER BY k.nomor;
END;
$$;

-- Livestream + rekaman offline satu season. Gerbang: kepemilikan season, tanpa waktu (§3.4).
CREATE FUNCTION public.get_season_peristiwa(p_season_id uuid)
RETURNS TABLE (kloter_nomor integer, jenis text, jadwal timestamptz, media_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Belum masuk' USING errcode = '28000', hint = 'BELUM_MASUK';
  END IF;

  IF NOT app_internal.is_admin() AND NOT EXISTS (
    SELECT 1 FROM public.user_seasons
    WHERE user_id = (SELECT auth.uid()) AND season_id = p_season_id
  ) THEN
    RAISE EXCEPTION 'Bukan season milikmu' USING errcode = '42501', hint = 'BUKAN_SEASON_MILIK';
  END IF;

  RETURN QUERY
  SELECT k.nomor, 'livestream'::text, k.livestream_at, k.livestream_url
  FROM public.kloters k
  WHERE k.season_id = p_season_id AND k.status <> 'draft' AND k.livestream_url IS NOT NULL
  UNION ALL
  SELECT k.nomor, 'rekaman_offline'::text, e.tanggal_waktu, e.rekaman_url
  FROM public.event_sessions e
  JOIN public.kloters k ON k.id = e.kloter_id
  WHERE k.season_id = p_season_id AND e.rekaman_url IS NOT NULL
  ORDER BY 1, 3;
END;
$$;


-- ============================================================
-- 5. RPC ZONA B — admin, mentor, staff, server
-- ============================================================

CREATE FUNCTION public.check_in_booking(p_qr_token text)
RETURNS TABLE (booking_id uuid, user_id uuid, session_id uuid, nama text, booking_status text,
               checked_in_at timestamptz, nama_sesi text, tanggal_waktu timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking record;
  v_session record;
  v_nama    text;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT app_internal.is_staff() THEN
    RAISE EXCEPTION 'akses ditolak' USING errcode = '42501', hint = 'AKSES_DITOLAK';
  END IF;

  SELECT b.id, b.user_id, b.session_id, b.status, b.checked_in_at INTO v_booking
  FROM public.bookings b WHERE b.qr_token = p_qr_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tiket tidak valid' USING errcode = 'TB201', hint = 'TIKET_TIDAK_VALID';
  END IF;

  SELECT s.nama_sesi, s.tanggal_waktu INTO v_session
  FROM public.event_sessions s WHERE s.id = v_booking.session_id;

  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'booking sudah dibatalkan' USING errcode = 'TB203', hint = 'BOOKING_DIBATALKAN';
  END IF;

  IF v_booking.status = 'checked_in' THEN
    RAISE EXCEPTION 'tiket sudah pernah dipakai check-in pada %',
      to_char(v_booking.checked_in_at AT TIME ZONE 'Asia/Jakarta', 'DD/MM/YYYY HH24:MI "WIB"')
      USING errcode = 'TB202', hint = 'SUDAH_CHECKED_IN';
  END IF;

  UPDATE public.bookings b
  SET status = 'checked_in', checked_in_at = now()
  WHERE b.id = v_booking.id
  RETURNING b.id, b.user_id, b.session_id, b.status, b.checked_in_at INTO v_booking;

  SELECT coalesce(u.nama_panggilan, u.nama, 'Peserta') INTO v_nama
  FROM public.users u WHERE u.id = v_booking.user_id;

  RETURN QUERY SELECT v_booking.id, v_booking.user_id, v_booking.session_id, v_nama,
                      v_booking.status, v_booking.checked_in_at, v_session.nama_sesi, v_session.tanggal_waktu;
END;
$$;

-- §3.5 + §3.9: hanya naskah mengikat, hanya setelah b5, hanya selama kloter belum ditutup.
CREATE FUNCTION public.nilai_karya(p_submission_id uuid, p_nilai jsonb) RETURNS public.writing_submissions
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

  UPDATE public.writing_submissions
  SET status = 'dinilai', nilai = p_nilai
  WHERE id = p_submission_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- §3.10: satu-satunya jalan mengubah seasons.terbit / seasons.tanggal_selesai.
CREATE FUNCTION public.ubah_status_season(p_season_id uuid, p_aksi text) RETURNS public.seasons
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_season public.seasons;
BEGIN
  IF NOT app_internal.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak' USING errcode = '42501', hint = 'AKSES_DITOLAK';
  END IF;

  SELECT * INTO v_season FROM public.seasons WHERE id = p_season_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Season tidak ditemukan' USING errcode = 'P0002', hint = 'SEASON_TIDAK_DITEMUKAN';
  END IF;

  IF p_aksi = 'terbitkan' THEN
    UPDATE public.seasons SET terbit = true WHERE id = p_season_id RETURNING * INTO v_season;

  ELSIF p_aksi = 'batal_terbit' THEN
    IF EXISTS (SELECT 1 FROM public.user_seasons WHERE season_id = p_season_id) THEN
      RAISE EXCEPTION 'Season sudah punya peserta' USING errcode = '55000', hint = 'SEASON_SUDAH_ADA_PESERTA';
    END IF;
    UPDATE public.seasons SET terbit = false WHERE id = p_season_id RETURNING * INTO v_season;

  ELSIF p_aksi = 'tutup' THEN
    IF public.status_siklus(v_season) = 'selesai' THEN
      RAISE EXCEPTION 'Season sudah selesai' USING errcode = '55000', hint = 'SEASON_SUDAH_SELESAI';
    END IF;
    -- A3b
    IF EXISTS (SELECT 1 FROM public.kloters WHERE season_id = p_season_id AND status = 'berjalan') THEN
      RAISE EXCEPTION 'Masih ada kloter berjalan' USING errcode = '55000', hint = 'MASIH_ADA_KLOTER_BERJALAN';
    END IF;
    UPDATE public.seasons SET tanggal_selesai = greatest(now(), tanggal_mulai)
    WHERE id = p_season_id RETURNING * INTO v_season;

  ELSE
    RAISE EXCEPTION 'Aksi tidak dikenal: %', p_aksi USING errcode = '22000', hint = 'AKSI_TIDAK_DIKENAL';
  END IF;

  RETURN v_season;
END;
$$;

-- §3.10: satu-satunya jalan mengubah kloters.status / kloters.tanggal_selesai.
CREATE FUNCTION public.ubah_status_kloter(p_kloter_id uuid, p_aksi text) RETURNS public.kloters
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
    IF EXISTS (SELECT 1 FROM public.naskah_mengikat WHERE kloter_id = p_kloter_id AND status = 'menunggu') THEN
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

-- §3.8: jenis ditentukan status season saat mendaftar, bukan oleh pemanggil.
-- Pemanggil: admin (dashboard) atau server dengan service role (webhook pembayaran, nanti).
CREATE FUNCTION public.daftarkan_peserta(p_user_id uuid, p_season_id uuid, p_sumber text)
RETURNS public.user_seasons
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_season public.seasons;
  v_kloter record;
  v_terisi integer;
  v_hasil  public.user_seasons;
BEGIN
  IF NOT app_internal.is_admin()
     AND coalesce((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Akses ditolak' USING errcode = '42501', hint = 'AKSES_DITOLAK';
  END IF;

  SELECT * INTO v_season FROM public.seasons WHERE id = p_season_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Season tidak ditemukan' USING errcode = 'P0002', hint = 'SEASON_TIDAK_DITEMUKAN';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_seasons WHERE user_id = p_user_id AND season_id = p_season_id) THEN
    RAISE EXCEPTION 'Sudah terdaftar di season ini' USING errcode = '23505', hint = 'SUDAH_TERDAFTAR';
  END IF;

  IF public.status_siklus(v_season) = 'selesai' THEN
    INSERT INTO public.user_seasons (user_id, season_id, kloter_daftar_id, jenis, sumber)
    VALUES (p_user_id, p_season_id, NULL, 'arsip', p_sumber)
    RETURNING * INTO v_hasil;
    RETURN v_hasil;
  END IF;

  SELECT kdf.id, kdf.kapasitas, kdf.fase INTO v_kloter
  FROM public.kloter_dalam_fase kdf
  WHERE kdf.season_id = p_season_id;

  IF NOT FOUND OR v_kloter.fase <> 'pendaftaran' THEN
    RAISE EXCEPTION 'Pendaftaran season ini sedang tutup' USING errcode = '55000', hint = 'PENDAFTARAN_TUTUP';
  END IF;

  -- Kunci baris kloter supaya dua pendaftaran bersamaan tidak melewati kapasitas.
  PERFORM 1 FROM public.kloters WHERE id = v_kloter.id FOR UPDATE;
  SELECT count(*) INTO v_terisi FROM public.user_seasons WHERE kloter_daftar_id = v_kloter.id;
  IF v_terisi >= v_kloter.kapasitas THEN
    RAISE EXCEPTION 'Kloter penuh' USING errcode = '55000', hint = 'KLOTER_PENUH';
  END IF;

  INSERT INTO public.user_seasons (user_id, season_id, kloter_daftar_id, jenis, sumber)
  VALUES (p_user_id, p_season_id, v_kloter.id, 'bimbingan', p_sumber)
  RETURNING * INTO v_hasil;

  RETURN v_hasil;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Sudah terdaftar di season ini' USING errcode = '23505', hint = 'SUDAH_TERDAFTAR';
END;
$$;

-- §3.2: satu-satunya jalan mengubah soal.kunci. Mengembalikan jumlah jawaban yang dihitung ulang.
CREATE FUNCTION public.koreksi_kunci(p_soal_id uuid, p_kunci smallint) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_jumlah integer;
BEGIN
  IF NOT app_internal.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak' USING errcode = '42501', hint = 'AKSES_DITOLAK';
  END IF;

  UPDATE public.soal SET kunci = p_kunci WHERE id = p_soal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Soal tidak ditemukan' USING errcode = 'P0002', hint = 'SOAL_TIDAK_DITEMUKAN';
  END IF;

  UPDATE public.kuis_peserta
  SET skor = app_internal.hitung_skor_kuis(soal_terpilih, jawaban_soal)
  WHERE p_soal_id = ANY (soal_terpilih) AND jawaban_soal IS NOT NULL;
  GET DIAGNOSTICS v_jumlah = ROW_COUNT;

  RETURN v_jumlah;
END;
$$;

-- Hak eksekusi RPC: bukan anon.
DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.create_booking(uuid, integer)',
    'public.update_profile(text, text, text, text, date, text, text)',
    'public.setor_karya(text)',
    'public.get_video_url(uuid)',
    'public.get_soal_kelas(uuid)',
    'public.jawab_kuis(uuid, jsonb)',
    'public.get_status_kuis(uuid)',
    'public.get_season_peristiwa(uuid)',
    'public.check_in_booking(text)',
    'public.nilai_karya(uuid, jsonb)',
    'public.ubah_status_season(uuid, text)',
    'public.ubah_status_kloter(uuid, text)',
    'public.daftarkan_peserta(uuid, uuid, text)',
    'public.koreksi_kunci(uuid, smallint)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION app_internal.gerbang_kuis(uuid) FROM PUBLIC;


-- ============================================================
-- 6. HAK AKSES TABEL & RLS
-- ============================================================

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_content        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kloters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soal                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kloter_mentors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_seasons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kuis_peserta        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings            ENABLE ROW LEVEL SECURITY;

-- users: tulis hanya lewat update_profile / trigger.
CREATE POLICY users_select_own_or_admin ON public.users FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT app_internal.is_admin()));

-- hero_content
CREATE POLICY hero_content_select_all ON public.hero_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY hero_content_admin_insert ON public.hero_content FOR INSERT TO authenticated
  WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY hero_content_admin_update ON public.hero_content FOR UPDATE TO authenticated
  USING ((SELECT app_internal.is_admin())) WITH CHECK (id = 1 AND (SELECT app_internal.is_admin()));

-- seasons: tulis langsung admin, kecuali terbit & tanggal_selesai (ubah_status_season).
CREATE POLICY seasons_select ON public.seasons FOR SELECT TO anon, authenticated
  USING (terbit OR (SELECT app_internal.is_admin()));
CREATE POLICY seasons_admin_insert ON public.seasons FOR INSERT TO authenticated
  WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY seasons_admin_update ON public.seasons FOR UPDATE TO authenticated
  USING ((SELECT app_internal.is_admin())) WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY seasons_admin_delete ON public.seasons FOR DELETE TO authenticated
  USING ((SELECT app_internal.is_admin()) AND NOT terbit);

REVOKE INSERT, UPDATE ON public.seasons FROM anon, authenticated;
GRANT INSERT (nomor_kaidah, nama, tanggal_mulai, tanggal_selesai) ON public.seasons TO authenticated;
GRANT UPDATE (nomor_kaidah, nama, tanggal_mulai) ON public.seasons TO authenticated;

-- kloters: tulis langsung admin untuk jadwal; status & tanggal_selesai lewat ubah_status_kloter.
-- livestream_url rahasia (dibaca lewat get_season_peristiwa).
CREATE POLICY kloters_select ON public.kloters FOR SELECT TO anon, authenticated
  USING (status <> 'draft' OR (SELECT app_internal.is_admin()));
CREATE POLICY kloters_admin_insert ON public.kloters FOR INSERT TO authenticated
  WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY kloters_admin_update ON public.kloters FOR UPDATE TO authenticated
  USING ((SELECT app_internal.is_admin()) AND status <> 'wrapped')
  WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY kloters_admin_delete ON public.kloters FOR DELETE TO authenticated
  USING ((SELECT app_internal.is_admin()) AND status = 'draft');

REVOKE SELECT, INSERT, UPDATE ON public.kloters FROM anon, authenticated;
GRANT SELECT (id, season_id, nomor, kapasitas, status, tanggal_mulai, tgl_mulai_orientasi,
              tgl_mulai_menyimak, tgl_mulai_setor, tgl_tenggat_setor, tanggal_selesai,
              target_penilaian, ambang_pengingat, livestream_at)
  ON public.kloters TO anon, authenticated;
GRANT INSERT (season_id, nomor, kapasitas, tanggal_mulai, tgl_mulai_orientasi, tgl_mulai_menyimak,
              tgl_mulai_setor, tgl_tenggat_setor, target_penilaian, ambang_pengingat,
              livestream_url, livestream_at)
  ON public.kloters TO authenticated;
GRANT UPDATE (nomor, kapasitas, tanggal_mulai, tgl_mulai_orientasi, tgl_mulai_menyimak,
              tgl_mulai_setor, tgl_tenggat_setor, target_penilaian, ambang_pengingat,
              livestream_url, livestream_at)
  ON public.kloters TO authenticated;

-- kelas: video_url rahasia (dibaca lewat get_video_url).
CREATE POLICY kelas_select ON public.kelas FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.seasons s WHERE s.id = season_id AND s.terbit)
         OR (SELECT app_internal.is_admin()));
CREATE POLICY kelas_admin_insert ON public.kelas FOR INSERT TO authenticated
  WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY kelas_admin_update ON public.kelas FOR UPDATE TO authenticated
  USING ((SELECT app_internal.is_admin())) WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY kelas_admin_delete ON public.kelas FOR DELETE TO authenticated
  USING ((SELECT app_internal.is_admin()));

REVOKE SELECT, INSERT, UPDATE ON public.kelas FROM anon;
REVOKE SELECT ON public.kelas FROM authenticated;
GRANT SELECT (id, season_id, nomor, judul, jumlah_soal_tampil) ON public.kelas TO anon, authenticated;

-- soal: seluruh baris rahasia; isi beku, hanya `aktif` yang boleh diubah; tanpa DELETE.
CREATE POLICY soal_admin_select ON public.soal FOR SELECT TO authenticated
  USING ((SELECT app_internal.is_admin()));
CREATE POLICY soal_admin_insert ON public.soal FOR INSERT TO authenticated
  WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY soal_admin_update ON public.soal FOR UPDATE TO authenticated
  USING ((SELECT app_internal.is_admin())) WITH CHECK ((SELECT app_internal.is_admin()));

REVOKE ALL ON public.soal FROM anon, authenticated;
GRANT SELECT, INSERT ON public.soal TO authenticated;
GRANT UPDATE (aktif) ON public.soal TO authenticated;

-- kloter_mentors: dikelola admin langsung; informasi saja, tidak menentukan akses (§3.9).
CREATE POLICY kloter_mentors_select ON public.kloter_mentors FOR SELECT TO authenticated USING (true);
CREATE POLICY kloter_mentors_admin_insert ON public.kloter_mentors FOR INSERT TO authenticated
  WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY kloter_mentors_admin_delete ON public.kloter_mentors FOR DELETE TO authenticated
  USING ((SELECT app_internal.is_admin()));

-- user_seasons: tulis hanya lewat daftarkan_peserta. Penilai perlu membaca untuk naskah_mengikat.
CREATE POLICY user_seasons_select ON public.user_seasons FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT app_internal.is_penilai()));

-- kuis_peserta: tulis hanya lewat get_soal_kelas / jawab_kuis / koreksi_kunci.
CREATE POLICY kuis_peserta_select_own ON public.kuis_peserta FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- writing_submissions: tulis hanya lewat setor_karya / nilai_karya.
CREATE POLICY writing_submissions_select ON public.writing_submissions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR app_internal.boleh_menilai_naskah(file_url));

CREATE POLICY certificates_select_own ON public.certificates FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- event_sessions: rekaman_url rahasia (dibaca lewat get_season_peristiwa);
-- kuota_terisi / kuota_kids_terisi hanya diubah create_booking (PR-03).
CREATE POLICY event_sessions_select ON public.event_sessions FOR SELECT TO anon, authenticated
  USING (status = 'published'
         OR (SELECT app_internal.is_admin())
         OR EXISTS (SELECT 1 FROM public.bookings b
                    WHERE b.session_id = event_sessions.id AND b.user_id = (SELECT auth.uid())));
CREATE POLICY event_sessions_admin_insert ON public.event_sessions FOR INSERT TO authenticated
  WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY event_sessions_admin_update ON public.event_sessions FOR UPDATE TO authenticated
  USING ((SELECT app_internal.is_admin())) WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY event_sessions_admin_delete ON public.event_sessions FOR DELETE TO authenticated
  USING ((SELECT app_internal.is_admin()));

REVOKE SELECT, UPDATE ON public.event_sessions FROM anon, authenticated;
GRANT SELECT (id, nama_sesi, tanggal_waktu, lokasi_atau_link, deskripsi, kapasitas, kuota_terisi,
              kapasitas_kids, kuota_kids_terisi, status, kloter_id, created_at)
  ON public.event_sessions TO anon, authenticated;
GRANT UPDATE (nama_sesi, tanggal_waktu, lokasi_atau_link, deskripsi, kapasitas, status,
              kloter_id, kapasitas_kids, rekaman_url)
  ON public.event_sessions TO authenticated;

-- bookings: tulis hanya lewat create_booking / check_in_booking.
CREATE POLICY bookings_select_own_or_admin ON public.bookings FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT app_internal.is_admin()));


-- ============================================================
-- 7. TRIGGER
-- ============================================================

CREATE TRIGGER trg_guard_tanggal_sesi
  BEFORE INSERT OR UPDATE OF tanggal_waktu, status ON public.event_sessions
  FOR EACH ROW EXECUTE FUNCTION app_internal.guard_tanggal_sesi();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app_internal.handle_new_user();

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION app_internal.rls_auto_enable();


-- ============================================================
-- 8. STORAGE: bucket naskah (§3.9)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'karya-tulis', 'karya-tulis', false, 10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Upload hanya ke folder sendiri. Tanpa policy UPDATE/DELETE: berkas yang sudah
-- diunggah tidak bisa ditimpa atau dihapus; revisi = setor ulang.
CREATE POLICY karya_tulis_insert_folder_sendiri ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'karya-tulis'
              AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY karya_tulis_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'karya-tulis'
         AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text
              OR app_internal.boleh_menilai_naskah(name)));


-- ============================================================
-- 9. DATA WAJIB
-- ============================================================

INSERT INTO public.hero_content (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
