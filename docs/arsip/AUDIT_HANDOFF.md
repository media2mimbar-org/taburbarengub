# [HISTORICAL ARCHIVE] Audit Handoff — TaburBarengUB Fase 1

> **Catatan Historis (2026-08-30):** Dokumen ini adalah artefak historis dari audit MVP Fase 1 (Juli 2026).
> Seluruh keputusan arsitektur dan model data terkini telah dirombak dan didokumentasikan secara otoritatif di **`docs/ARCHITECTURE.md`**, **`docs/ROADMAP.md`**, dan **`docs/REVIEW_ACTION_TRACKER.md`**.

Tanggal handoff asli: 2026-07-26
## 1. Stack

- Next.js App Router, dengan source di `src/`
- TypeScript
- Supabase Auth + Supabase Postgres
- Supabase SSR client via `@supabase/ssr`
- Zod untuk validasi request body
- `html5-qrcode` untuk scanner kamera browser
- `react-qr-code` untuk render QR tiket

## 2. Environment variables

Required di `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Catatan:

- Jangan taruh `sb_secret_...` atau service role key di variable `NEXT_PUBLIC_*`.
- Saat ini belum ada server-only service role key di aplikasi.

## 3. Database / Supabase assumptions

Schema utama sedang dipindahkan ke `supabase/migrations/`, yang menjadi satu-satunya sumber otoritatif.

Catatan penting untuk reviewer: `schema-fase1.sql` yang dirujuk versi sebelumnya sudah tidak ada, dan `schema-fase1-final.sql` yang menggantikannya **belum tentu cocok dengan database live** — patch v2 diaplikasikan langsung di Supabase tanpa melewati file. Karena itu baseline migration diambil dari database live (`supabase db pull`), bukan dari file, lalu di-diff terhadap file untuk menemukan drift-nya. Sampai langkah itu selesai, jangan menganggap file `.sql` mana pun di root sebagai kebenaran.

Entitas utama:

- `users`
- `event_sessions`
- `hero_content`
- `bookings`

RPC/function penting:

- `handle_new_user()`
  - Trigger setelah insert `auth.users`
  - Membuat profile row di `public.users`
  - Menyimpan `nama`, `email`, `no_hp`, `usia`, `profesi`, `domisili`

- `is_admin()`
  - Helper role check untuk RLS dan RPC admin

- `create_booking(p_session_id, p_qr_token)`
  - Authenticated only
  - Session harus `published`
  - Session harus `offline`
  - Cek duplicate booking sebelum cek kuota
  - Lock row `event_sessions` dengan `for update`
  - Increment `event_sessions.kuota_terisi`
  - Insert row `bookings`

- `check_in_booking(p_qr_token)`
  - Admin only
  - Lock row booking dengan `for update`
  - Reject QR invalid
  - Reject QR yang sudah `checked_in`
  - Update status ke `checked_in`
  - Return data minimal: `booking_id`, `user_id`, `session_id`, `nama`, `booking_status`, `checked_in_at`
  - Tidak return `no_hp` ke scanner untuk data minimization

RLS:

- `users`
  - User bisa select profile sendiri
  - Admin bisa select semua user
  - Tidak ada direct update policy untuk user biasa

- `event_sessions`
  - Public/anon hanya bisa select session `published`
  - Admin bisa insert/update/delete

- `hero_content`
  - Public bisa select
  - Admin bisa update

- `bookings`
  - User bisa select booking sendiri
  - Admin bisa select semua booking
  - Tidak ada direct insert/update/delete policy untuk user biasa; write harus lewat RPC

## 4. Implemented route list

### Public / auth

- `/`
  - Landing page
  - Hero content dari `hero_content`
  - Daftar session `published`

- `/login`
  - Supabase email/password login

- `/register`
  - Supabase signup
  - Metadata tambahan dikirim ke trigger DB

- `/sesi/[id]`
  - Detail sesi published
  - Tombol booking untuk user login
  - Link login untuk user belum login
  - Jika sudah booking, link ke `/tiket-saya`

### Member

- `/tiket-saya`
  - Protected by `src/app/(member)/layout.tsx`
  - Menampilkan booking user login
  - Render QR code dari `bookings.qr_token`
  - Menampilkan status booking/check-in

### Admin

Protected by `src/app/admin/layout.tsx`, role harus `admin`.

- `/admin`
  - Admin dashboard menu

- `/admin/sesi`
  - Daftar semua sesi: draft, published, cancelled
  - Menampilkan kuota terisi read-only

- `/admin/sesi/new`
  - Form tambah sesi

- `/admin/sesi/[id]/edit`
  - Form edit sesi
  - `kuota_terisi` tidak bisa diedit manual
  - Validasi kapasitas tidak boleh lebih kecil dari `kuota_terisi`

- `/admin/peserta`
  - Pilih sesi
  - Daftar peserta per sesi
  - Menampilkan kontak/profil/status/check-in

- `/admin/peserta/export.csv?session_id=...`
  - Export CSV peserta per sesi
  - Route handler melakukan auth + role check sendiri

- `/admin/scanner`
  - Browser camera scanner
  - Scan QR tiket
  - POST ke `/api/check-in`
  - Menampilkan berhasil/gagal check-in

### API routes

- `POST /api/bookings`
  - Login required
  - Validasi JSON body + Zod
  - Body: `{ "session_id": "uuid" }`
  - Memanggil RPC `create_booking`

- `POST /api/check-in`
  - Login required
  - Validasi JSON body + Zod
  - Body: `{ "qr_token": "..." }`
  - Memanggil RPC `check_in_booking`
  - Role admin tetap ditegakkan di RPC DB

## 5. Manual test checklist

### Auth

- [ ] Register user baru dengan `nama`, `email`, `password`, `no_hp`, `usia`
- [ ] Row muncul di Supabase Auth
- [ ] Row profile muncul di `public.users`
- [ ] Login berhasil
- [ ] Logout dari homepage/admin berhasil

### Public sessions

- [ ] Session `draft` tidak muncul di homepage
- [ ] Session `published` muncul di homepage
- [ ] `/sesi/[id]` untuk draft menghasilkan 404 untuk publik/non-admin route public
- [ ] `/sesi/[id]` untuk published tampil normal

### Booking

- [ ] User belum login diarahkan login untuk booking
- [ ] User login bisa booking sesi offline published dengan kuota tersedia
- [ ] Setelah booking, row `bookings` bertambah
- [ ] `event_sessions.kuota_terisi` naik 1
- [ ] User tidak bisa booking sesi yang sama dua kali
- [ ] User tidak bisa booking sesi online
- [ ] User tidak bisa booking sesi draft/cancelled
- [ ] User tidak bisa booking sesi penuh

### Tiket / QR

- [ ] `/tiket-saya` hanya bisa dibuka user login
- [ ] Booking tampil di `/tiket-saya`
- [ ] QR code tampil dan bisa discan
- [ ] Status berubah jika sudah check-in

### Scanner / check-in

- [ ] User non-admin tidak bisa buka `/admin/scanner`
- [ ] Admin bisa buka scanner
- [ ] Scanner bisa akses kamera di Chrome Android
- [ ] Scanner bisa membaca QR tiket
- [ ] QR valid mengubah booking ke `checked_in`
- [ ] Scan QR yang sama kedua kali menghasilkan error `QR sudah dipakai`
- [ ] Scan QR random menghasilkan error `QR tidak valid`

### Admin sessions

- [ ] Non-admin redirect dari `/admin`
- [ ] Admin bisa melihat semua sesi di `/admin/sesi`
- [ ] Admin bisa tambah sesi baru
- [ ] Admin bisa edit sesi
- [ ] Admin tidak bisa edit `kuota_terisi` manual
- [ ] Published session muncul di landing

### Admin participants/export

- [ ] Admin bisa pilih sesi di `/admin/peserta`
- [ ] Peserta booking muncul di tabel
- [ ] Status check-in tampil benar
- [ ] Export CSV terdownload
- [ ] CSV berisi peserta sesi yang benar
- [ ] Non-admin tidak bisa akses CSV export

## 6. Build/lint status

Terakhir dilaporkan sudah aman:

- `npm run lint` clean setelah fix scanner ref render
- `npm run build` clean setelah fix `item.disabled`

Warning yang sudah ditangani/ditarget:

- `middleware` deprecated → sudah diganti ke `proxy`
- multiple lockfiles → home directory lockfile accidental sudah dibersihkan oleh developer

## 7. Known limitations / technical debt

1. Styling masih inline dan belum pakai design system.
2. QR token saat ini dibuat di Next.js API lalu dikirim ke RPC `create_booking`.
   - Risiko aktif rendah, tapi lebih bersih jika token dibuat langsung di DB dengan `gen_random_bytes`.
3. `kuota_terisi` adalah denormalized counter.
   - Aman selama semua booking/cancel lewat RPC.
   - Admin UI tidak boleh mengedit manual.
   - Belum ada fitur cancel booking.
4. Belum ada forgot password.
5. Email confirmation dimatikan untuk MVP cepat.
6. Belum ada waitlist.
7. Belum ada notifikasi booking via email/WhatsApp.
8. Belum ada role `member`; hanya `user` dan `admin`.
9. Online sessions hanya bisa ditampilkan locked; belum bisa dibooking.
10. Belum ada pagination/search untuk admin peserta.
11. CSV export berisi PII, jadi route admin check wajib tetap diaudit.
12. Scanner browser perlu diuji di device staff yang sebenarnya, terutama iOS/Safari jika digunakan.

## 8. Audit focus untuk reviewer

Mohon audit khusus area berikut:

1. RLS policies dan security definer functions
   - Apakah ada policy yang terlalu longgar?
   - Apakah `search_path = public` sudah cukup?
   - Apakah grant/revoke function sudah tepat?

2. Booking concurrency
   - Apakah `create_booking` benar-benar aman dari overbooking?
   - Apakah duplicate booking dan quota check urutannya sudah tepat?

3. Check-in flow
   - Apakah `check_in_booking` aman dari double-scan race condition?
   - Apakah data yang dikembalikan ke scanner sudah minimal?

4. API routes
   - Apakah `/api/bookings` dan `/api/check-in` handle invalid JSON dan error mapping dengan benar?
   - Apakah role check cukup di API + DB RPC?

5. Admin participant export
   - Apakah route CSV sudah aman untuk PII?
   - Apakah query join ke `users` aman di bawah RLS?

6. Next.js App Router correctness
   - Penggunaan Server Component vs Client Component
   - `params`/`searchParams` promise style untuk Next 16
   - `proxy.ts` Supabase session refresh

7. Production readiness
   - Env handling
   - Missing error boundaries/loading state
   - Data leakage risk
   - UX edge cases

## 9. Git history snapshot

```text
46ef9ed Rename middleware to proxy
56e50cc Fix build and lint errors
707b4ed Add logout button
a3475bc remove leftover old file
59a3bc8 Add participant CSV export
13ca1a1 Add admin participant list
c299e4a Add admin session create and edit forms
cc396c4 Add admin sessions list
9da3c34 Polish admin QR scanner page
a2386ff Connect QR scanner to check-in API
ee75dfe Add booking flow and ticket QR page
06b6f4d Add landing page and session detail
1db7912 add qr
11d15cb initial commit, incomplete
```
