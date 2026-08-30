-- ============================================================
-- Security & Business Logic Hardening
--
-- 1. HIGH-1: RPC submit_classroom_progress (Single Gate of Write for classroom)
--    Enforces auth, season ownership, and active phase gating on video/quiz progress.
-- 2. HIGH-2: Unify admin/staff/mentor roles:
--    - app_internal.is_admin() -> role = 'admin'
--    - app_internal.is_staff() -> role in ('admin', 'staff') for check-in
--    - app_internal.is_mentor_for_kloter(kloter_id) -> gates nilai_karya
-- 3. MED-3: Validate storage object path format in setor_karya
-- 4. Clean dead code in check_in_booking
-- ============================================================

-- ------------------------------------------------------------
-- 1. Role Helper Functions in app_internal
-- ------------------------------------------------------------

-- A. is_admin (strictly admin)
CREATE OR REPLACE FUNCTION app_internal.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.role = 'admin'
  );
$$;

-- B. is_staff (admin or staff, e.g. for QR scanner check-in)
CREATE OR REPLACE FUNCTION app_internal.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.role IN ('admin', 'staff')
  );
$$;

ALTER FUNCTION app_internal.is_staff() OWNER TO postgres;
REVOKE ALL ON FUNCTION app_internal.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_internal.is_staff() TO authenticated, anon, service_role;

-- C. is_mentor_for_kloter (admin or assigned mentor in kloter_mentors)
CREATE OR REPLACE FUNCTION app_internal.is_mentor_for_kloter(p_kloter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    (SELECT app_internal.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.kloter_mentors km
      WHERE km.kloter_id = p_kloter_id
        AND km.mentor_id = (SELECT auth.uid())
    )
  );
$$;

ALTER FUNCTION app_internal.is_mentor_for_kloter(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION app_internal.is_mentor_for_kloter(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_internal.is_mentor_for_kloter(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 2. Single Gate of Write for Classroom Progress (HIGH-1)
-- ------------------------------------------------------------

-- Drop direct write policies so all mutations MUST go through the RPC
DROP POLICY IF EXISTS video_progress_insert_own ON public.video_progress;
DROP POLICY IF EXISTS video_progress_update_own ON public.video_progress;

CREATE OR REPLACE FUNCTION public.submit_classroom_progress(
  p_kelas_id uuid,
  p_watched_seconds integer default 0,
  p_quiz_answers jsonb default null,
  p_quiz_score integer default null
)
RETURNS public.video_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid;
  v_season_id uuid;
  v_progress  public.video_progress;
  v_score     integer;
  v_completed boolean;
BEGIN
  -- 0. Auth check
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Belum login'
      USING errcode = '28000', hint = 'BELUM_MASUK';
  END IF;

  -- 1. Find kelas & verify existence
  SELECT season_id INTO v_season_id
  FROM public.kelas
  WHERE id = p_kelas_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kelas tidak ditemukan'
      USING errcode = 'P0002', hint = 'KELAS_TIDAK_DITEMUKAN';
  END IF;

  -- 2. Verify user owns the season
  IF NOT EXISTS (
    SELECT 1 FROM public.user_seasons
    WHERE user_id = v_user_id AND season_id = v_season_id
  ) THEN
    RAISE EXCEPTION 'Bukan season milikmu'
      USING errcode = '42501', hint = 'BUKAN_SEASON_MILIK';
  END IF;

  -- 3. Verify menyimak phase is open
  IF NOT EXISTS (
    SELECT 1 FROM public.kloter_aktif ka
    JOIN public.kloter_phases kp ON kp.kloter_id = ka.id
    WHERE ka.season_id = v_season_id
      AND kp.phase IN ('menyimak', 'menulis_setor', 'wrapped')
      AND now() >= kp.opens_at
  ) THEN
    RAISE EXCEPTION 'Akses materi belum dibuka'
      USING errcode = '22000', hint = 'FASE_BELUM_DIBUKA';
  END IF;

  -- 4. Calculate score & completion
  v_score := coalesce(p_quiz_score, 100);
  v_completed := (coalesce(p_watched_seconds, 0) >= 60 OR p_quiz_answers IS NOT NULL);

  -- 5. Upsert progress atomically
  -- 5. Upsert progress atomically matching table schema
  INSERT INTO public.video_progress (
    user_id,
    kelas_id,
    ditonton,
    jawaban_soal,
    skor
  )
  VALUES (
    v_user_id,
    p_kelas_id,
    v_completed,
    p_quiz_answers,
    v_score
  )
  ON CONFLICT (user_id, kelas_id) DO UPDATE
  SET ditonton = public.video_progress.ditonton OR EXCLUDED.ditonton,
      jawaban_soal = coalesce(EXCLUDED.jawaban_soal, public.video_progress.jawaban_soal),
      skor = coalesce(EXCLUDED.skor, public.video_progress.skor)
  RETURNING * INTO v_progress;

  RETURN v_progress;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_classroom_progress(uuid, integer, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_classroom_progress(uuid, integer, jsonb, integer) TO authenticated;

-- ------------------------------------------------------------
-- 3. Update nilai_karya with Mentor-Kloter Assignment Gate (HIGH-2)
-- ------------------------------------------------------------

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
  IF (SELECT auth.uid()) IS NULL THEN
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

  -- Gate on mentor assignment or admin
  IF NOT app_internal.is_mentor_for_kloter(v_row.kloter_id) THEN
    RAISE EXCEPTION 'Bukan mentor untuk kloter ini'
      USING errcode = '42501', hint = 'BUKAN_MENTOR_KLOTER';
  END IF;

  UPDATE public.writing_submissions
  SET status = 'dinilai',
      nilai = p_nilai
  WHERE id = p_submission_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ------------------------------------------------------------
-- 4. Update check_in_booking (Staff Gate & Dead Code Cleanup)
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS public.check_in_booking(text);

CREATE OR REPLACE FUNCTION public.check_in_booking(p_qr_token text)
RETURNS TABLE (
  booking_id     uuid,
  user_id        uuid,
  session_id     uuid,
  nama           text,
  booking_status text,
  checked_in_at  timestamp with time zone,
  nama_sesi      text,
  tanggal_waktu  timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_session record;
  v_nama    text;
BEGIN
  -- 0. Guard auth & role (admin or staff)
  IF (SELECT auth.uid()) IS NULL OR NOT app_internal.is_staff() THEN
    RAISE EXCEPTION 'akses ditolak'
      USING errcode = '42501', hint = 'AKSES_DITOLAK';
  END IF;

  -- 1. Cari booking berdasarkan qr_token (FOR UPDATE)
  SELECT b.id, b.user_id, b.session_id, b.status, b.checked_in_at
  INTO v_booking
  FROM public.bookings b
  WHERE b.qr_token = p_qr_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tiket tidak valid'
      USING errcode = 'TB201', hint = 'TIKET_TIDAK_VALID';
  END IF;

  -- 2. Ambil info sesi
  SELECT s.nama_sesi, s.tanggal_waktu
  INTO v_session
  FROM public.event_sessions s
  WHERE s.id = v_booking.session_id;

  -- 3. Cek apakah booking dibatalkan
  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'booking sudah dibatalkan'
      USING errcode = 'TB203', hint = 'BOOKING_DIBATALKAN';
  END IF;

  -- 4. Cek double check-in
  IF v_booking.status = 'checked_in' THEN
    RAISE EXCEPTION 'tiket sudah pernah dipakai check-in pada %',
      to_char(v_booking.checked_in_at at time zone 'Asia/Jakarta', 'DD/MM/YYYY HH24:MI "WIB"')
      USING errcode = 'TB202', hint = 'SUDAH_CHECKED_IN';
  END IF;

  -- 5. Update status jadi checked_in
  UPDATE public.bookings
  SET status = 'checked_in',
      checked_in_at = now()
  WHERE id = v_booking.id
  RETURNING * INTO v_booking;

  -- 6. Ambil nama user untuk konfirmasi di scanner
  SELECT coalesce(u.nama_panggilan, u.nama, 'Peserta')
  INTO v_nama
  FROM public.users u
  WHERE u.id = v_booking.user_id;

  RETURN QUERY SELECT
    v_booking.id,
    v_booking.user_id,
    v_booking.session_id,
    v_nama,
    v_booking.status,
    v_booking.checked_in_at,
    v_session.nama_sesi,
    v_session.tanggal_waktu;
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_booking(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_in_booking(text) TO authenticated;

-- ------------------------------------------------------------
-- 5. Update setor_karya with Storage Path Regex Validation (MED-3)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.setor_karya(p_file_url text)
RETURNS public.writing_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid;
  v_kloter_id uuid;
  v_season_id uuid;
  v_fase      public.phase_type;
  v_versi     integer;
  v_hasil     public.writing_submissions;
  v_clean_path text;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Belum masuk'
      USING errcode = '28000', hint = 'BELUM_MASUK';
  END IF;

  -- Validasi format storage path (.docx, .doc, .pdf)
  v_clean_path := trim(coalesce(p_file_url, ''));
  IF v_clean_path ~ '\.\.' OR v_clean_path !~ '^[\w\-/.]+\.(docx|doc|pdf)$' THEN
    RAISE EXCEPTION 'Format berkas harus .docx, .doc, atau .pdf'
      USING errcode = '22000', hint = 'FORMAT_FILE_TIDAK_VALID';
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
  VALUES (v_user_id, v_kloter_id, v_versi, v_clean_path)
  RETURNING * INTO v_hasil;

  RETURN v_hasil;
END;
$$;
