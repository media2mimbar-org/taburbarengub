-- ============================================================
-- Migrasi: Rombak event_sessions, Kids Corner, Roles & Mentors
-- 
-- 1. Hapus kolom `tipe` dari event_sessions (semua sesi adalah offline).
-- 2. Tambah kapasitas_kids & kuota_kids_terisi ke event_sessions.
-- 3. Tambah jumlah_anak (maksimal 5) ke bookings.
-- 4. Perluas role users ke ('user', 'admin', 'mentor', 'staff').
-- 5. Tambah tabel relasi penugasan kloter_mentors.
-- 6. Update RPC create_booking dengan atomic dual-counter lock.
-- ============================================================

-- 1. Rombak event_sessions
alter table public.event_sessions
  drop column if exists tipe;

alter table public.event_sessions
  add column if not exists kapasitas_kids integer not null default 0 check (kapasitas_kids >= 0),
  add column if not exists kuota_kids_terisi integer not null default 0 check (kuota_kids_terisi >= 0);

-- 2. Rombak bookings (Maksimal 5 anak per pemesan)
alter table public.bookings
  add column if not exists jumlah_anak integer not null default 0 check (jumlah_anak >= 0 and jumlah_anak <= 5);

-- 3. Perluas users.role
alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('user', 'admin', 'mentor', 'staff'));

-- 4. Tabel Penugasan Mentor per Kloter
create table if not exists public.kloter_mentors (
  id         uuid primary key default gen_random_uuid(),
  kloter_id  uuid not null references public.kloters(id) on delete cascade,
  mentor_id  uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (kloter_id, mentor_id)
);

alter table public.kloter_mentors enable row level security;

create policy kloter_mentors_select_all
  on public.kloter_mentors for select
  using (true);

-- 5. Update RPC create_booking dengan dual-counter lock
drop function if exists public.create_booking(uuid);

create or replace function public.create_booking(
  p_session_id uuid,
  p_jumlah_anak integer default 0
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.event_sessions;
  v_booking public.bookings;
  v_anak integer;
begin
  -- 0. Auth check
  if (select auth.uid()) is null then
    raise exception 'auth required'
      using errcode = '28000', hint = 'AUTH_DIPERLUKAN';
  end if;

  -- 1. Profile completion check
  if not exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.profile_completed = true
  ) then
    raise exception 'profil belum lengkap'
      using errcode = 'TB106', hint = 'PROFIL_BELUM_LENGKAP';
  end if;

  -- 2. Validasi batas jumlah anak
  v_anak := coalesce(p_jumlah_anak, 0);
  if v_anak < 0 or v_anak > 5 then
    raise exception 'Jumlah anak harus antara 0 sampai 5'
      using errcode = 'TB107', hint = 'BATAS_ANAK_TIDAK_VALID';
  end if;

  -- 3. Lock session row (FOR UPDATE)
  select * into v_session
  from public.event_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'sesi tidak ditemukan'
      using errcode = 'TB101', hint = 'SESI_TIDAK_DITEMUKAN';
  end if;

  if v_session.status <> 'published' then
    raise exception 'sesi tidak ditemukan'
      using errcode = 'TB101', hint = 'SESI_TIDAK_DITEMUKAN';
  end if;

  if v_session.tanggal_waktu <= now() then
    raise exception 'sesi sudah lewat'
      using errcode = 'TB104', hint = 'SESI_SUDAH_LEWAT';
  end if;

  -- 4. Cek duplikasi booking
  if exists (
    select 1 from public.bookings b
    where b.user_id = (select auth.uid())
      and b.session_id = p_session_id
  ) then
    raise exception 'sudah booking sesi ini'
      using errcode = 'TB105', hint = 'BOOKING_DUPLIKAT';
  end if;

  -- 5. Cek kuota kursi dewasa
  if v_session.kuota_terisi >= v_session.kapasitas then
    raise exception 'kuota penuh'
      using errcode = 'TB103', hint = 'SESI_KUOTA_PENUH';
  end if;

  -- 6. Cek kuota Kids Corner (jika membawa anak)
  if v_anak > 0 then
    if (v_session.kuota_kids_terisi + v_anak) > v_session.kapasitas_kids then
      raise exception 'kuota kids corner penuh'
        using errcode = 'TB108', hint = 'KIDS_CORNER_PENUH';
    end if;
  end if;

  -- 7. Atomic update kedua counter
  update public.event_sessions
  set kuota_terisi = kuota_terisi + 1,
      kuota_kids_terisi = kuota_kids_terisi + v_anak
  where id = p_session_id;

  -- 8. Insert booking
  insert into public.bookings (user_id, session_id, qr_token, jumlah_anak)
  values (
    (select auth.uid()),
    p_session_id,
    encode(extensions.gen_random_bytes(32), 'hex'),
    v_anak
  )
  returning * into v_booking;

  return v_booking;
exception
  when unique_violation then
    raise exception 'sudah booking sesi ini'
      using errcode = 'TB105', hint = 'BOOKING_DUPLIKAT';
end;
$$;

-- 6. Grants
revoke update on table public.event_sessions from authenticated;
revoke update on table public.event_sessions from anon;

grant update (
  nama_sesi,
  tanggal_waktu,
  lokasi_atau_link,
  deskripsi,
  kapasitas,
  kapasitas_kids,
  status,
  kloter_id
) on table public.event_sessions to authenticated;

revoke all on function public.create_booking(uuid, integer) from public;
revoke all on function public.create_booking(uuid, integer) from anon;
grant execute on function public.create_booking(uuid, integer) to authenticated;
