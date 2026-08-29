-- =============================================================================
-- Season & Kloter Core Schema Migration
-- =============================================================================
-- Acuan: Schema Season/Kloter — kontrak & keputusan (26 Agt 2026)
--        dan tabur-schema.sql
-- =============================================================================

-- 1. EXTENSIONS
-- btree_gist diperlukan untuk EXCLUDE constraint yang mencampur '=' dan '&&'
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- 2. ENUMS
CREATE TYPE public.phase_type AS ENUM (
  'offline',
  'pendaftaran',
  'orientasi',
  'menyimak',
  'menulis_setor',
  'wrapped',
  'antara_kloter'
);

-- 3. SYSTEM-OWNED TABLES
CREATE TABLE public.seasons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_kaidah    integer NOT NULL,
  nama            text NOT NULL,
  tanggal_mulai   timestamptz NOT NULL,
  tanggal_selesai timestamptz,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'berjalan', 'selesai'))
);

CREATE TABLE public.kloters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       uuid NOT NULL REFERENCES public.seasons(id),
  nomor           integer NOT NULL,
  tanggal_mulai   timestamptz NOT NULL,
  tanggal_selesai timestamptz,
  kapasitas       integer NOT NULL,
  UNIQUE (season_id, nomor),
  CONSTRAINT kloter_tidak_overlap EXCLUDE USING gist (
    tstzrange(tanggal_mulai, coalesce(tanggal_selesai, 'infinity'::timestamptz), '[)') WITH &&
  )
);

CREATE TABLE public.kloter_phases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kloter_id       uuid NOT NULL REFERENCES public.kloters(id),
  phase           public.phase_type NOT NULL,
  opens_at        timestamptz NOT NULL,
  closes_at       timestamptz NOT NULL,
  override_active boolean NOT NULL DEFAULT false,
  override_by     uuid REFERENCES public.users(id),
  override_at     timestamptz,
  UNIQUE (kloter_id, phase),
  CONSTRAINT fase_tidak_overlap EXCLUDE USING gist (
    kloter_id WITH =,
    tstzrange(opens_at, closes_at, '[)') WITH &&
  )
);

CREATE UNIQUE INDEX satu_override_aktif
  ON public.kloter_phases (kloter_id) WHERE override_active;

CREATE TABLE public.kelas (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id),
  nomor     integer NOT NULL,
  judul     text NOT NULL,
  video_url text,
  UNIQUE (season_id, nomor)
);

-- Relasi event_sessions ke kloter (opsional/nullable untuk pembuka kloter)
ALTER TABLE public.event_sessions ADD COLUMN kloter_id uuid REFERENCES public.kloters(id);

-- 4. USER-OWNED TABLES
CREATE TABLE public.user_seasons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id),
  season_id         uuid NOT NULL REFERENCES public.seasons(id),
  kloter_daftar_id  uuid NOT NULL REFERENCES public.kloters(id),
  tanggal_diperoleh timestamptz NOT NULL DEFAULT now(),
  sumber            text NOT NULL CHECK (sumber IN ('beli', 'gratis')),
  UNIQUE (user_id, season_id)
);

CREATE TABLE public.video_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id),
  kelas_id     uuid NOT NULL REFERENCES public.kelas(id),
  ditonton     boolean NOT NULL DEFAULT false,
  jawaban_soal jsonb,
  skor         integer,
  UNIQUE (user_id, kelas_id)
);

CREATE TABLE public.writing_submissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id),
  kloter_id  uuid NOT NULL REFERENCES public.kloters(id),
  versi      integer NOT NULL DEFAULT 1,
  file_url   text NOT NULL,
  status     text NOT NULL DEFAULT 'menunggu'
             CHECK (status IN ('menunggu', 'dinilai')),
  nilai      jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kloter_id, versi)
);

CREATE TABLE public.certificates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id),
  user_season_id uuid NOT NULL REFERENCES public.user_seasons(id),
  jenis          text NOT NULL CHECK (jenis IN ('lulus', 'ikut_serta')),
  issued_at      timestamptz NOT NULL DEFAULT now()
);

-- 5. VIEW kloter_aktif
CREATE VIEW public.kloter_aktif WITH (security_invoker = true) AS
SELECT k.*,
       coalesce(
         (SELECT phase FROM public.kloter_phases
           WHERE kloter_id = k.id AND override_active),
         (SELECT phase FROM public.kloter_phases
           WHERE kloter_id = k.id AND now() >= opens_at AND now() < closes_at)
       ) AS fase
FROM public.kloters k
JOIN public.seasons s ON s.id = k.season_id
WHERE k.tanggal_mulai <= now()
  AND coalesce(k.tanggal_selesai, 'infinity'::timestamptz) > now()
  AND s.status = 'berjalan'
ORDER BY k.tanggal_mulai DESC
LIMIT 1;

-- 6. RPC setor_karya
CREATE OR REPLACE FUNCTION public.setor_karya(p_file_url text)
RETURNS public.writing_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id   uuid;
  v_kloter_id uuid;
  v_season_id uuid;
  v_fase      public.phase_type;
  v_versi     integer;
  v_hasil     public.writing_submissions;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Belum masuk' USING errcode = '42501';
  END IF;

  SELECT id, season_id, fase INTO v_kloter_id, v_season_id, v_fase
  FROM public.kloter_aktif;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tidak ada kloter berjalan' USING errcode = 'P0002';
  END IF;

  IF v_fase IS DISTINCT FROM 'menulis_setor' THEN
    RAISE EXCEPTION 'Belum/sudah lewat jendela setor (fase: %)',
                    coalesce(v_fase::text, 'di luar fase terjadwal')
                    USING errcode = '22000';
  END IF;

  PERFORM 1 FROM public.user_seasons
  WHERE user_id = v_user_id AND season_id = v_season_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bukan season milikmu yang sedang berjalan' USING errcode = '42501';
  END IF;

  SELECT coalesce(max(versi), 0) + 1 INTO v_versi
  FROM public.writing_submissions
  WHERE user_id = v_user_id AND kloter_id = v_kloter_id;

  INSERT INTO public.writing_submissions (user_id, kloter_id, versi, file_url)
  VALUES (v_user_id, v_kloter_id, v_versi, p_file_url)
  RETURNING * INTO v_hasil;

  RETURN v_hasil;
END $$;

-- 7. RLS & GRANTS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kloters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kloter_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY seasons_select_all ON public.seasons FOR SELECT USING (true);
CREATE POLICY kloters_select_all ON public.kloters FOR SELECT USING (true);
CREATE POLICY kloter_phases_select_all ON public.kloter_phases FOR SELECT USING (true);
CREATE POLICY kelas_select_all ON public.kelas FOR SELECT USING (true);
CREATE POLICY user_seasons_select_own ON public.user_seasons FOR SELECT USING (user_id = auth.uid());
CREATE POLICY video_progress_select_own ON public.video_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY writing_submissions_select_own ON public.writing_submissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY certificates_select_own ON public.certificates FOR SELECT USING (user_id = auth.uid());

GRANT EXECUTE ON FUNCTION public.setor_karya(text) TO authenticated;
