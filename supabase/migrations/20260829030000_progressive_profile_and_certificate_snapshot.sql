-- ============================================================
-- 1. Bersihkan trigger lama & sesuaikan handle_new_user()
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nama text;
  v_nama_panggilan text;
  v_no_hp text;
  v_jenis_kelamin text;
  v_tanggal_lahir date;
  v_profesi text;
  v_domisili text;
begin
  v_nama := nullif(trim(coalesce(new.raw_user_meta_data->>'nama', '')), '');
  v_nama_panggilan := nullif(trim(coalesce(new.raw_user_meta_data->>'nama_panggilan', '')), '');
  v_no_hp := nullif(trim(coalesce(new.raw_user_meta_data->>'no_hp', '')), '');
  v_jenis_kelamin := nullif(trim(coalesce(new.raw_user_meta_data->>'jenis_kelamin', '')), '');
  v_profesi := nullif(trim(coalesce(new.raw_user_meta_data->>'profesi', '')), '');
  v_domisili := nullif(trim(coalesce(new.raw_user_meta_data->>'domisili', '')), '');

  if v_jenis_kelamin is not null and v_jenis_kelamin not in ('ikhwan', 'akhwat') then
    v_jenis_kelamin := null;
  end if;

  -- Validasi & normalisasi format nomor HP ke 628... jika ada di metadata
  if v_no_hp is not null and v_no_hp ~ '^(\+62|62|0)8[0-9]{8,12}$' then
    if v_no_hp ~ '^\+62' then
      v_no_hp := substring(v_no_hp from 2);
    elsif v_no_hp ~ '^08' then
      v_no_hp := '62' || substring(v_no_hp from 2);
    end if;
  else
    v_no_hp := null;
  end if;

  begin
    v_tanggal_lahir := nullif(new.raw_user_meta_data->>'tanggal_lahir', '')::date;
    if v_tanggal_lahir > current_date or v_tanggal_lahir < '1900-01-01' then
      v_tanggal_lahir := null;
    end if;
  exception when others then
    v_tanggal_lahir := null;
  end;
  insert into public.users (
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
  values (
    new.id,
    v_nama, -- Biarkan NULL jika tidak diisi, jangan tanam placeholder palsu
    v_nama_panggilan,
    new.email,
    v_no_hp,
    v_jenis_kelamin,
    v_tanggal_lahir,
    v_profesi,
    v_domisili
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================
-- 2. Modifikasi Skema Tabel Users, Event Sessions, & Certificates
-- ============================================================
-- A. Bersihkan profile_completed & usia, tambah jenis_kelamin & tanggal_lahir di users
alter table public.users
  drop constraint if exists profile_completed_requires_full_profile,
  drop constraint if exists users_usia_check,
  drop column if exists profile_completed,
  drop column if exists usia;

alter table public.users
  add column if not exists jenis_kelamin text
  check (jenis_kelamin in ('ikhwan', 'akhwat')),
  add column if not exists tanggal_lahir date
  check (tanggal_lahir is null or (tanggal_lahir <= current_date and tanggal_lahir >= '1900-01-01'));
-- B. Pastikan kapasitas_kids & kuota_kids_terisi NOT NULL DEFAULT 0 (Fail-closed)
update public.event_sessions
set kapasitas_kids = coalesce(kapasitas_kids, 0),
    kuota_kids_terisi = coalesce(kuota_kids_terisi, 0)
where kapasitas_kids is null or kuota_kids_terisi is null;

alter table public.event_sessions
  alter column kapasitas_kids set default 0,
  alter column kapasitas_kids set not null,
  alter column kuota_kids_terisi set default 0,
  alter column kuota_kids_terisi set not null;

-- C. Tambahkan nama_penerima NOT NULL di certificates (tanpa default palsu)
alter table public.certificates
  add column if not exists nama_penerima text not null;

-- ============================================================
-- 3. Hapus RPC Usang untuk Mencegah Overload Basi
-- ============================================================
drop function if exists public.complete_user_profile(text, text, text, integer, text, text);
drop function if exists public.create_booking(uuid);
drop function if exists public.create_booking(uuid, integer);
drop function if exists public.update_profile(text, text, text, integer, text, text);
drop function if exists public.update_profile(text, text, text, text, integer, text, text);
drop function if exists public.update_profile(text, text, text, text, date, text, text);
-- ============================================================
-- 4. Buat RPC update_profile (Fleksibel, Normalisasi No. HP, Aman auth.uid())
-- ============================================================
create or replace function public.update_profile(
  p_nama text default null,
  p_nama_panggilan text default null,
  p_no_hp text default null,
  p_jenis_kelamin text default null,
  p_tanggal_lahir date default null,
  p_profesi text default null,
  p_domisili text default null
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
  v_clean_no_hp text;
begin
  if (select auth.uid()) is null then
    raise exception 'auth required'
      using errcode = '28000', hint = 'AUTH_DIPERLUKAN';
  end if;

  if p_jenis_kelamin is not null and p_jenis_kelamin not in ('ikhwan', 'akhwat') then
    raise exception 'Jenis kelamin tidak valid, harus ikhwan atau akhwat'
      using errcode = '22000', hint = 'JENIS_KELAMIN_TIDAK_VALID';
  end if;

  if p_tanggal_lahir is not null and (p_tanggal_lahir > current_date or p_tanggal_lahir < '1900-01-01') then
    raise exception 'Tanggal lahir tidak valid'
      using errcode = '22000', hint = 'TANGGAL_LAHIR_TIDAK_VALID';
  end if;
  if p_no_hp is not null and trim(p_no_hp) <> '' then
    v_clean_no_hp := trim(p_no_hp);
    if v_clean_no_hp !~ '^(\+62|62|0)8[0-9]{8,12}$' then
      raise exception 'Format nomor WhatsApp tidak valid (contoh: 08123456789)'
        using errcode = '22000', hint = 'FORMAT_NO_HP_TIDAK_VALID';
    end if;

    -- Normalisasi ke format standar 628... (tanpa tanda '+')
    if v_clean_no_hp ~ '^\+62' then
      v_clean_no_hp := substring(v_clean_no_hp from 2);
    elsif v_clean_no_hp ~ '^08' then
      v_clean_no_hp := '62' || substring(v_clean_no_hp from 2);
    end if;
  else
    v_clean_no_hp := null;
  end if;

  update public.users
  set nama = coalesce(nullif(trim(p_nama), ''), nama),
      nama_panggilan = coalesce(nullif(trim(p_nama_panggilan), ''), nama_panggilan),
      no_hp = coalesce(v_clean_no_hp, no_hp),
      jenis_kelamin = coalesce(p_jenis_kelamin, jenis_kelamin),
      tanggal_lahir = coalesce(p_tanggal_lahir, tanggal_lahir),
      profesi = coalesce(nullif(trim(p_profesi), ''), profesi),
      domisili = coalesce(nullif(trim(p_domisili), ''), domisili)
  where id = (select auth.uid())
  returning * into v_user;

  if not found then
    raise exception 'User profile tidak ditemukan'
      using errcode = 'P0002', hint = 'USER_TIDAK_DITEMUKAN';
  end if;

  return v_user;
end;
$$;

-- ============================================================
-- 5. Buat RPC create_booking (Validasi Kontekstual TB109 & Fail-closed Kids Corner)
-- ============================================================
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
  v_user public.users;
  v_anak integer;
begin
  -- 0. Auth check
  if (select auth.uid()) is null then
    raise exception 'auth required'
      using errcode = '28000', hint = 'AUTH_DIPERLUKAN';
  end if;

  -- 1. Validasi kontekstual No. WA (TB109)
  select * into v_user
  from public.users
  where id = (select auth.uid());

  if not found then
    raise exception 'User profile tidak ditemukan'
      using errcode = 'P0002', hint = 'USER_TIDAK_DITEMUKAN';
  end if;

  if v_user.no_hp is null or nullif(trim(v_user.no_hp), '') is null then
    raise exception 'Nomor WhatsApp wajib diisi sebelum memesan tiket'
      using errcode = 'TB109', hint = 'NO_HP_DIPERLUKAN';
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

  if not found or v_session.status <> 'published' then
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

  -- 6. Cek kuota Kids Corner (Fail-closed)
  if v_anak > 0 then
    if (v_session.kuota_kids_terisi + v_anak) > coalesce(v_session.kapasitas_kids, 0) then
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

-- ============================================================
-- 6. Set Grants Keamanan (Termasuk create_booking yang baru di-DROP)
-- ============================================================
revoke all on function public.update_profile(text, text, text, text, date, text, text) from public, anon;
grant execute on function public.update_profile(text, text, text, text, date, text, text) to authenticated;

revoke all on function public.create_booking(uuid, integer) from public, anon;
grant execute on function public.create_booking(uuid, integer) to authenticated;
