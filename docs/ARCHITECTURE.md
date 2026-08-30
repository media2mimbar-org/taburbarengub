# Architecture Notes — TaburBarengUB

Dokumen ini menjelaskan keputusan arsitektur dan spesifikasi teknis platform **TaburBarengUB** (mencakup sistem kajian offline Fase 1 dan sistem kelas online Season & Kloter Fase 2).
Tujuannya adalah menjadi sumber kebenaran tunggal (*single source of truth*) bagi developer mengenai **di mana logika diletakkan**, **pola yang harus diikuti**, dan **alasan di balik keputusan arsitektur tersebut**.

---

## 1. Ringkasan & Prinsip Utama

TaburBarengUB menggunakan pendekatan **Layered Next.js Architecture** yang berpasangan dengan **Database-Enforced Invariants** di PostgreSQL / Supabase:

```text
               ┌─────────────────────────────────────────────────────────┐
               │                    INTERNET / CLIENT                    │
               └───────────────┬─────────────────────────┬───────────────┘
                               │                         │
                (1) User JWT   │                         │ (2) Admin Web UI
              (authenticated)  │                         │   (Cookie Session)
                               ▼                         ▼
               ┌─────────────────────────┐     ┌─────────────────────────┐
               │  Direct Supabase Client │     │  Next.js Server Actions │
               │   (Browser / Android)   │     │    / API Route Handlers │
               └───────────────┬─────────┘     └─────────────┬───────────┘
                               │                             │ (3) service_role
                               │ RPC                         │     Admin Client
                               ▼                             ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────┐
    │                                 POSTGRESQL DATABASE                                    │
    │                                                                                        │
    │  📂 SCHEMA: public (Diekspos ke PostgREST API)                                          │
    │  ├── [Zone A: User-Invoked RPCs - Hak Akses: authenticated]                            │
    │  │   ├── create_booking()       ← Kunci tiket & kuota atomik                           │
    │  │   ├── update_profile()       ← Ubah data diri (auth.uid())                          │
    │  │   ├── setor_karya()          ← Upload naskah (window menulis_setor)                 │
    │  │   └── get_video_url()        ← Stream video (threshold menyimak)                    │
    │  │                                                                                     │
    │  └── [Zone B: Admin-Invoked RPCs - Hak Akses: authenticated + app_internal.is_admin()] │
    │      ├── nilai_karya()          ← Grading naskah kloter (via Route /api/admin/grade)   │
    │      └── check_in_booking()     ← Scan QR tiket (via Route /api/check-in)              │
    │                                                                                        │
    │  🔒 SCHEMA: app_internal (100% Tersembunyi dari PostgREST API)                         │
    │  ├── is_admin()                 ← Helper evaluasi RLS (InitPlan subquery)              │
    │  └── Triggers / Internal Guards ← guard_tanggal_sesi(), handle_new_user()              │
    └────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3 Prinsip Dasar:
1. **Single Gate of Write (RPC Atomic Mutation):**
   Semua mutasi yang memiliki aturan bisnis kritis (kuota, nomor versi, status pembayaran, penilaian) **wajib** melewati PostgreSQL Stored Procedure (RPC) `SECURITY DEFINER` dengan penguncian `FOR UPDATE`. Akses direct `INSERT`/`UPDATE` pada tabel ditutup via RLS.
2. **Single Global Clock & Computed Phase (Fail-Closed):**
   Fase kloter tidak disimpan sebagai status statis di tabel, melainkan dihitung secara dinamis dari `now()` server Postgres melalui view `kloter_aktif (security_invoker = true)`.
3. **Progressive Profiling & Zero Monolithic Blockers:**
   Tidak ada boolean global `profile_completed`. Data profil peserta diminta secara bertahap sesuai kebutuhan aksi (*contextual validation*).

---

## 2. Struktur Layer & Tanggung Jawab

| Layer | Lokasi Folder | Tanggung Jawab Utama |
|---|---|---|
| **Presentation Layer** | `src/app/**/page.tsx`, `src/components/ui/*` | Server Components untuk rendering HTML, fetching data awal, susunan layout, dan navigasi. |
| **Client Interaction Layer** | `src/features/*/client/*` (`'use client'`) | State interaktif browser (`useState`, `useReducer`), event handler form, dan feedback visual. |
| **API Controller Layer** | `src/app/api/**/route.ts` | Validasi payload Zod, autentikasi sesi, translasi error HTTP, dan delegasi ke service layer. |
| **Service Layer** | `src/features/*/server/*` | Orkestrasi logika domain backend, query data Supabase, dan eksekusi RPC. |
| **Shared Domain & Schemas** | `src/features/*/shared/*` | Tipe data DTO, aturan domain murni, dan Zod validation schemas. |
| **Database Enforcement** | `supabase/migrations/*` | RLS policies, check constraints, foreign keys, GiST exclusion, dan RPC transactional locking. |

---

## 3. Arsitektur Domain: Season & Kloter (Fase 2)

### 3.1 Hierarki Domain
- **1 Kaidah = 1 Season** (±1 tahun, total 14 kaidah).
- **1 Season = 6 Kloter** (rombongan peserta).
- **1 Kloter = 7 Fase Berurutan**:
  1. `offline` (Kajian pembuka fisik di Masjid/Aula).
  2. `pendaftaran` (Pendaftaran kloter & grup WA).
  3. `orientasi` (Pengenalan & persiapan belajar).
  4. `menyimak` (Akses video kelas online terbuka).
  5. `menulis_setor` (Jendela pengumpulan naskah tugas terbuka).
  6. `wrapped` (Penilaian mentor, review, & penerbitan sertifikat).
  7. `antara_kloter` (Jeda istirahat sebelum kloter berikutnya).

### 3.2 Aturan Anti-Overlap & Single Global Clock
- Maksimal **1 kloter aktif platform-wide** pada satu waktu.
- Ditegakkan di level database engine menggunakan ekstensi `btree_gist`:
  ```sql
  CONSTRAINT kloter_tidak_overlap EXCLUDE USING gist (
    tstzrange(tanggal_mulai, tanggal_selesai) WITH &&
  );
  ```
- Fase aktif ditentukan secara dinamis melalui view `public.kloter_aktif`:
  ```sql
  CREATE VIEW public.kloter_aktif WITH (security_invoker = true) AS
  SELECT k.id, k.season_id, k.nomor, kp.phase AS fase, kp.opens_at, kp.closes_at
  FROM public.kloters k
  JOIN public.kloter_phases kp ON kp.kloter_id = k.id
  WHERE now() >= kp.opens_at AND now() < kp.closes_at;
  ```

### 3.3 Gating Akses Materi & Tugas
- **Video Kelas (Threshold):** Akses video terbuka sejak `now() >= opens_at` dari fase `menyimak` bagi peserta yang memiliki `user_seasons`. URL video (`kelas.video_url`) dicabut dari SELECT publik dan digate lewat RPC `public.get_video_url(p_kelas_id)`.
- **Pengumpulan Tugas (Window):** Pengumpulan naskah hanya diizinkan saat `kloter_aktif.fase = 'menulis_setor'` melalui RPC `public.setor_karya(p_file_url)` dengan auto-increment versi naskah.

---

## 4. Arsitektur Domain: Kajian Offline & Booking (Fase 1 Overhaul)

### 4.1 Peran `event_sessions`
- `event_sessions` dikhususkan untuk **Kajian Pembuka Offline Fisik** (kolom `tipe` telah dihapus).
- Terhubung secara opsional ke kloter online melalui foreign key `event_sessions.kloter_id`.

### 4.2 Kids Corner & Dual-Counter Atomic Lock
- Setiap sesi memiliki kuota kursi dewasa (`kapasitas`, `kuota_terisi`) dan kuota Kids Corner (`kapasitas_kids`, `kuota_kids_terisi`).
- Peserta dapat mendaftarkan 0 sampai 5 anak (`CHECK (jumlah_anak >= 0 AND jumlah_anak <= 5)`).
- RPC `create_booking(p_session_id, p_jumlah_anak)` mengunci baris sesi (`FOR UPDATE`) dan memperbarui kedua counter secara atomik dalam satu transaksi fail-closed:
  ```sql
  IF (v_session.kuota_kids_terisi + v_anak) > coalesce(v_session.kapasitas_kids, 0) THEN
    RAISE EXCEPTION 'kuota kids corner penuh' USING errcode = 'TB108';
  END IF;
  ```

---

## 5. Model Data & Progressive Profiling

### 5.1 Skema Tabel `public.users`
- **Identitas Akun:** `id uuid PK (FK auth.users)`, `email text UNIQUE NOT NULL`, `role text NOT NULL CHECK (role IN ('user', 'admin', 'mentor', 'staff'))`.
- **Data Profil:**
  - `nama text`: Nama Lengkap Resmi (digunakan untuk mencetak sertifikat).
  - `nama_panggilan text`: Nama Sapaan / Panggilan.
  - `no_hp text`: Nomor WhatsApp (otomatis dinormalkan ke format `628...`).
  - `jenis_kelamin text CHECK (jenis_kelamin IN ('ikhwan', 'akhwat'))`: Untuk alokasi shaf/kapasitas ruangan venue fisik.
  - `tanggal_lahir date CHECK (tanggal_lahir IS NULL OR (tanggal_lahir <= CURRENT_DATE AND tanggal_lahir >= '1900-01-01'))`: Menggantikan kolom usia statis sehingga umur dapat dihitung dinamis kapan saja.
  - `profesi text`, `domisili text`: Data demografi opsional.

### 5.2 Snapshot Invariant Sertifikat (G9)
- Tabel `public.certificates` memiliki kolom **`nama_penerima text NOT NULL`**.
- Nama resmi peserta dibekukan saat sertifikat diterbitkan, sehingga mutasi profil di kemudian hari tidak mengubah sertifikat historis yang sah.

---

## 6. Keamanan, RLS, & Kepatuhan Best Practices

1. **RLS InitPlan Optimization:**
   Seluruh policy RLS membungkus fungsi pembantu dengan subquery `(SELECT auth.uid())` dan `(SELECT app_internal.is_admin())` agar dievaluasi sekali per query (*InitPlan caching*), meningkatkan performa hingga 10x-100x.
2. **100% Foreign Key Indexing:**
   Semua kolom Foreign Key (`user_id`, `session_id`, `kloter_id`, `season_id`, `override_by`, dll.) memiliki indeks B-tree untuk mencegah table locks dan sequential scan saat join / cascade.
3. **Search Path Isolation:**
   Semua fungsi `SECURITY DEFINER` menyetel `SET search_path = public` secara eksplisit untuk mencegah *search_path hijacking*.
4. **Prinsip Hak Akses Terkecil (*Least Privilege*):**
   Fungsi trigger dan helper internal diisolasi di skema `app_internal` dan tidak dapat diakses melalui HTTP PostgREST API.
