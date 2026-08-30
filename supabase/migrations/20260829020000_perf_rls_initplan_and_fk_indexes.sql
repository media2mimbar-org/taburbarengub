-- ============================================================
-- Supabase Postgres Best Practices: RLS InitPlan & Foreign Key Indexes
--
-- 1. RLS InitPlan Optimization:
--    Wrap auth.uid() and is_admin() calls in `(select auth.uid())`
--    so PostgreSQL evaluates the function ONCE per query as an InitPlan,
--    rather than executing it per-row on table scans (10x-100x speedup).
--
-- 2. Consolidate Multiple Permissive Policies on event_sessions:
--    Merge multiple SELECT policies into one single policy to avoid
--    redundant rule evaluations on every query.
--
-- 3. Foreign Key Indexes:
--    Postgres does not automatically index foreign keys. Adding explicit
--    indexes prevents full table scans on JOINs and cascading operations.
-- ============================================================

-- ------------------------------------------------------------
-- 1. RLS InitPlan Optimizations
-- ------------------------------------------------------------

-- public.bookings
drop policy if exists "bookings_select_own_or_admin" on public.bookings;
create policy "bookings_select_own_or_admin"
  on public.bookings
  for select
  to authenticated
  using (
    (user_id = (select auth.uid()))
    or (select public.is_admin())
  );

-- public.users
drop policy if exists "users_select_own_or_admin" on public.users;
create policy "users_select_own_or_admin"
  on public.users
  for select
  to authenticated
  using (
    (id = (select auth.uid()))
    or (select public.is_admin())
  );

-- public.user_seasons
drop policy if exists "user_seasons_select_own" on public.user_seasons;
drop policy if exists "milik_sendiri" on public.user_seasons;
create policy "user_seasons_select_own"
  on public.user_seasons
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- public.video_progress
drop policy if exists "video_progress_select_own" on public.video_progress;
drop policy if exists "milik_sendiri" on public.video_progress;
create policy "video_progress_select_own"
  on public.video_progress
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- public.writing_submissions
drop policy if exists "writing_submissions_select_own" on public.writing_submissions;
drop policy if exists "milik_sendiri" on public.writing_submissions;
create policy "writing_submissions_select_own"
  on public.writing_submissions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- public.certificates
drop policy if exists "certificates_select_own" on public.certificates;
drop policy if exists "milik_sendiri" on public.certificates;
create policy "certificates_select_own"
  on public.certificates
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- 2. Consolidate Multiple Permissive Policies on event_sessions
-- ------------------------------------------------------------
drop policy if exists "event_sessions_select_pemegang_tiket" on public.event_sessions;
drop policy if exists "event_sessions_select_published_or_admin" on public.event_sessions;
drop policy if exists "event_sessions_select" on public.event_sessions;

create policy "event_sessions_select"
  on public.event_sessions
  for select
  to authenticated, anon
  using (
    status = 'published'
    or (select public.is_admin())
    or exists (
      select 1 from public.bookings b
      where b.session_id = event_sessions.id
        and b.user_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- 3. Foreign Key & Query Performance Indexes
-- ------------------------------------------------------------

-- seasons query index
create index if not exists idx_seasons_status
  on public.seasons (status);

-- kloters foreign keys
create index if not exists idx_kloters_season_id
  on public.kloters (season_id);

-- kloter_phases foreign keys
create index if not exists idx_kloter_phases_kloter_id
  on public.kloter_phases (kloter_id);

-- kelas foreign keys
create index if not exists idx_kelas_season_id
  on public.kelas (season_id);

-- event_sessions foreign keys
create index if not exists idx_event_sessions_kloter_id
  on public.event_sessions (kloter_id);

-- user_seasons foreign keys
create index if not exists idx_user_seasons_user_id
  on public.user_seasons (user_id);

create index if not exists idx_user_seasons_season_id
  on public.user_seasons (season_id);

create index if not exists idx_user_seasons_kloter_daftar_id
  on public.user_seasons (kloter_daftar_id);

-- video_progress foreign keys
create index if not exists idx_video_progress_user_id
  on public.video_progress (user_id);

create index if not exists idx_video_progress_kelas_id
  on public.video_progress (kelas_id);

-- writing_submissions foreign keys
create index if not exists idx_writing_submissions_user_id
  on public.writing_submissions (user_id);

create index if not exists idx_writing_submissions_kloter_id
  on public.writing_submissions (kloter_id);

-- certificates foreign keys
create index if not exists idx_certificates_user_id
  on public.certificates (user_id);

create index if not exists idx_certificates_user_season_id
  on public.certificates (user_season_id);

-- kloter_mentors foreign keys
create index if not exists idx_kloter_mentors_kloter_id
  on public.kloter_mentors (kloter_id);

create index if not exists idx_kloter_mentors_mentor_id
  on public.kloter_mentors (mentor_id);

-- kloter_phases foreign keys
create index if not exists idx_kloter_phases_override_by
  on public.kloter_phases (override_by);
