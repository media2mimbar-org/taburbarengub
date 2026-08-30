-- ============================================================
-- Isolate Internal Functions & Triggers to app_internal Schema
--
-- 1. Create app_internal schema (100% hidden from PostgREST API)
-- 2. Move is_admin() to app_internal.is_admin()
-- 3. Move triggers (guard_tanggal_sesi, handle_new_user) to app_internal
-- 4. Update all RLS policies to use app_internal.is_admin()
-- 5. Update admin RPCs (nilai_karya, check_in_booking)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Schema app_internal
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS app_internal;

GRANT USAGE ON SCHEMA app_internal TO authenticated, anon, service_role;

-- ------------------------------------------------------------
-- 2. Helper is_admin() in app_internal
-- ------------------------------------------------------------
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
      AND u.role IN ('admin', 'staff')
  );
$$;

ALTER FUNCTION app_internal.is_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION app_internal.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_internal.is_admin() TO authenticated, anon, service_role;

-- ------------------------------------------------------------
-- 3. Internal Trigger Functions in app_internal
-- ------------------------------------------------------------

-- A. guard_tanggal_sesi
CREATE OR REPLACE FUNCTION app_internal.guard_tanggal_sesi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.status = 'published' AND new.tanggal_waktu <= now() THEN
    RAISE EXCEPTION 'tidak bisa menerbitkan sesi yang sudah lewat'
      USING errcode = 'TB104', hint = 'SESI_SUDAH_LEWAT';
  END IF;
  RETURN new;
END;
$$;

ALTER FUNCTION app_internal.guard_tanggal_sesi() OWNER TO postgres;
REVOKE ALL ON FUNCTION app_internal.guard_tanggal_sesi() FROM PUBLIC, anon, authenticated;

-- B. handle_new_user
CREATE OR REPLACE FUNCTION app_internal.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.users (
    id,
    nama,
    nama_panggilan,
    email,
    no_hp,
    jenis_kelamin,
    tanggal_lahir,
    profesi,
    domisili
  )
  VALUES (
    new.id,
    v_nama,
    v_nama_panggilan,
    new.email,
    v_no_hp,
    v_jenis_kelamin,
    v_tanggal_lahir,
    v_profesi,
    v_domisili
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

ALTER FUNCTION app_internal.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION app_internal.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 4. Re-point Triggers
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS "trg_guard_tanggal_sesi" ON "public"."event_sessions";
DROP TRIGGER IF EXISTS "guard_tanggal_sesi" ON "public"."event_sessions";
CREATE TRIGGER "trg_guard_tanggal_sesi"
  BEFORE INSERT OR UPDATE OF "tanggal_waktu", "status" ON "public"."event_sessions"
  FOR EACH ROW EXECUTE FUNCTION app_internal.guard_tanggal_sesi();

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION app_internal.handle_new_user();

-- ------------------------------------------------------------
-- 5. Update RLS Policies to use app_internal.is_admin()
-- ------------------------------------------------------------

-- public.users
DROP POLICY IF EXISTS "users_select_own_or_admin" ON public.users;
CREATE POLICY "users_select_own_or_admin"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    (id = (SELECT auth.uid()))
    OR (SELECT app_internal.is_admin())
  );

-- public.bookings
DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_select_own_or_admin"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR (SELECT app_internal.is_admin())
  );

-- public.event_sessions
DROP POLICY IF EXISTS "event_sessions_select" ON public.event_sessions;
DROP POLICY IF EXISTS "event_sessions_select_published_or_admin" ON public.event_sessions;
CREATE POLICY "event_sessions_select"
  ON public.event_sessions
  FOR SELECT
  TO authenticated, anon
  USING (
    status = 'published'
    OR (SELECT app_internal.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.session_id = event_sessions.id
        AND b.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "event_sessions_admin_insert" ON public.event_sessions;
CREATE POLICY "event_sessions_admin_insert"
  ON public.event_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_internal.is_admin()));

DROP POLICY IF EXISTS "event_sessions_admin_update" ON public.event_sessions;
CREATE POLICY "event_sessions_admin_update"
  ON public.event_sessions
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_internal.is_admin()))
  WITH CHECK ((SELECT app_internal.is_admin()));

DROP POLICY IF EXISTS "event_sessions_admin_delete" ON public.event_sessions;
CREATE POLICY "event_sessions_admin_delete"
  ON public.event_sessions
  FOR DELETE
  TO authenticated
  USING ((SELECT app_internal.is_admin()));

-- public.hero_content
DROP POLICY IF EXISTS "hero_content_admin_insert" ON public.hero_content;
CREATE POLICY "hero_content_admin_insert"
  ON public.hero_content
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT app_internal.is_admin()));

DROP POLICY IF EXISTS "hero_content_admin_update" ON public.hero_content;
CREATE POLICY "hero_content_admin_update"
  ON public.hero_content
  FOR UPDATE
  TO authenticated
  USING ((SELECT app_internal.is_admin()))
  WITH CHECK (id = 1 AND (SELECT app_internal.is_admin()));

-- public.writing_submissions
DROP POLICY IF EXISTS "writing_submissions_select" ON public.writing_submissions;
CREATE POLICY "writing_submissions_select"
  ON public.writing_submissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT app_internal.is_admin())
  );

-- ------------------------------------------------------------
-- 6. Update Admin RPCs (nilai_karya & check_in_booking)
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
  IF (SELECT auth.uid()) IS NULL OR NOT app_internal.is_admin() THEN
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
  -- 0. Guard auth & role
  IF (SELECT auth.uid()) IS NULL OR NOT app_internal.is_admin() THEN
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
    SELECT coalesce(u.nama_panggilan, u.nama, 'Peserta')
    INTO v_nama
    FROM public.users u
    WHERE u.id = v_booking.user_id;

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
-- 7. Drop Obsolete Public Functions
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.guard_tanggal_sesi() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
