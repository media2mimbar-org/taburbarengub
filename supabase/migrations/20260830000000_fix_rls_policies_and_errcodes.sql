-- ============================================================
-- Fix: RLS Policies, Video URL Access Control, Error Codes
--
-- Critical 1: video_progress has no INSERT/UPDATE policy — upsert
--   from authenticated users is blocked by RLS.
-- Critical 2: writing_submissions has no UPDATE policy for grading;
--   add a SECURITY DEFINER RPC (nilai_karya) gated on is_admin().
-- Critical 3: kelas.video_url is exposed via USING (true) SELECT;
--   replace with a secure view that gates video_url on ownership
--   + menyimak phase, and restrict the base table policy.
-- Important 5: setor_karya uses the same errcode '42501' for two
--   different failure branches; assign distinct codes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. video_progress: add INSERT & UPDATE for own rows
-- ------------------------------------------------------------
CREATE POLICY video_progress_insert_own
  ON public.video_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY video_progress_update_own
  ON public.video_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------
-- 2. writing_submissions: admin/mentor grading via RPC
-- ------------------------------------------------------------

-- nilai_karya: SECURITY DEFINER RPC for grading, gated on is_admin()
-- Mirrors the setor_karya pattern — locks the row, validates, updates.
CREATE OR REPLACE FUNCTION public.nilai_karya(
  p_submission_id uuid,
  p_nilai jsonb
)
RETURNS public.writing_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.writing_submissions;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak'
      USING errcode = '42501', hint = 'AKSES_DITOLAK';
  END IF;

  SELECT * INTO v_row
  FROM public.writing_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Naskah tidak ditemukan'
      USING errcode = 'P0002', hint = 'NASKAH_TIDAK_DITEMUKAN';
  END IF;

  UPDATE public.writing_submissions
  SET status = 'dinilai',
      nilai = p_nilai
  WHERE id = p_submission_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.nilai_karya(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nilai_karya(uuid, jsonb) TO authenticated;

-- Consolidated SELECT policy for writing_submissions (single permissive policy for authenticated)
DROP POLICY IF EXISTS writing_submissions_select_own ON public.writing_submissions;
DROP POLICY IF EXISTS writing_submissions_select_admin ON public.writing_submissions;
DROP POLICY IF EXISTS writing_submissions_select ON public.writing_submissions;

CREATE POLICY writing_submissions_select
  ON public.writing_submissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );
-- ------------------------------------------------------------
-- 3. Restrict kelas.video_url via secure view
--
-- Strategy: drop the permissive SELECT-all policy on kelas and
-- replace with one that strips video_url. Create a security-definer
-- function that returns video_url only when ownership + phase check
-- pass. The service layer already calls this function-equivalent
-- via getClassListWithProgress, but this closes the PostgREST hole.
-- ------------------------------------------------------------

-- Replace the wide-open policy with one that never returns video_url
-- via direct PostgREST. We use column-level grants: revoke SELECT on
-- video_url from authenticated/anon, leaving it readable only via the
-- SECURITY DEFINER function or from service_role.
REVOKE SELECT ON public.kelas FROM authenticated, anon;
GRANT SELECT (id, season_id, nomor, judul) ON public.kelas TO authenticated, anon;

-- Secure function: returns video_url only if user owns the season
-- AND the menyimak phase is currently active.
CREATE OR REPLACE FUNCTION public.get_video_url(p_kelas_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_season_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT season_id, video_url INTO v_season_id, v_url
  FROM public.kelas
  WHERE id = p_kelas_id;

  IF NOT FOUND OR v_url IS NULL THEN
    RETURN NULL;
  END IF;

  -- User must own the season
  IF NOT EXISTS (
    SELECT 1 FROM public.user_seasons
    WHERE user_id = (SELECT auth.uid()) AND season_id = v_season_id
  ) THEN
    RETURN NULL;
  END IF;

  -- menyimak phase must be active in current kloter
  IF NOT EXISTS (
    SELECT 1 FROM public.kloter_aktif ka
    JOIN public.kloter_phases kp ON kp.kloter_id = ka.id
    WHERE ka.season_id = v_season_id
      AND kp.phase IN ('menyimak', 'menulis_setor', 'wrapped')
      AND now() >= kp.opens_at
      AND now() < kp.closes_at
  ) THEN
    RETURN NULL;
  END IF;

  RETURN v_url;
END;
$$;

REVOKE ALL ON FUNCTION public.get_video_url(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_video_url(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 4. Fix setor_karya error codes — assign distinct errcodes
--    so the client can match on error.code instead of message text
-- ------------------------------------------------------------
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
    RAISE EXCEPTION 'Belum masuk'
      USING errcode = '28000', hint = 'BELUM_MASUK';
  END IF;

  SELECT id, season_id, fase INTO v_kloter_id, v_season_id, v_fase
  FROM public.kloter_aktif;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tidak ada kloter berjalan'
      USING errcode = 'P0002', hint = 'KLOTER_TIDAK_ADA';
  END IF;

  IF v_fase IS DISTINCT FROM 'menulis_setor' THEN
    RAISE EXCEPTION 'Belum/sudah lewat jendela setor (fase: %)',
                    coalesce(v_fase::text, 'di luar fase terjadwal')
                    USING errcode = '22000', hint = 'JENDELA_SETOR_TERTUTUP';
  END IF;

  PERFORM 1 FROM public.user_seasons
  WHERE user_id = v_user_id AND season_id = v_season_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bukan season milikmu yang sedang berjalan'
      USING errcode = '42501', hint = 'BUKAN_SEASON_MILIK';
  END IF;

  SELECT coalesce(max(versi), 0) + 1 INTO v_versi
  FROM public.writing_submissions
  WHERE user_id = v_user_id AND kloter_id = v_kloter_id;

  INSERT INTO public.writing_submissions (user_id, kloter_id, versi, file_url)
  VALUES (v_user_id, v_kloter_id, v_versi, p_file_url)
  RETURNING * INTO v_hasil;

  RETURN v_hasil;
END $$;

-- ------------------------------------------------------------
-- 5. Revoke unneeded public/anon privileges on SECURITY DEFINER functions
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.setor_karya(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setor_karya(text) TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.guard_tanggal_sesi() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 6. Clarify storage object path semantics on file_url
-- ------------------------------------------------------------
COMMENT ON COLUMN public.writing_submissions.file_url IS 'Storage object path in private bucket karya-tulis (e.g. user_id/kloter_id/filename.pdf); signed URL is generated dynamically for inline preview.';
