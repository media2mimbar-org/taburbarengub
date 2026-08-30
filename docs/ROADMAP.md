# Roadmap — TaburBarengUB

> **Status Proyek:** Menuju Peluncuran Penuh (Web & Native Android Ready)  
> **Diperbarui:** 2026-08-30 (Fase Backend Overhaul Selesai & Terverifikasi)  
> **Branch Aktif:** `rombak/backend` (Tersinkronisasi ke remote)

---

## 1. Status Kemajuan Fase

```text
[✅ FASE 1: Baseline MVP] ──▶ [✅ FASE R: Restrukturisasi] ──▶ [✅ FASE B: Backend Overhaul] ──▶ [⏳ FASE F: Frontend Milestones]
 (Kajian Offline & Tiket)       (Feature-Based & Routing)        (Season-Kloter & Security)         (Member Hub & Classroom)
```

| Fase | Periode | Status | Cakupan Utama |
|---|---|:---:|---|
| **Fase 1: Baseline MVP** | Juli 2026 | ✅ **Selesai** | Kajian offline, booking tiket QR, scanner check-in, singleton Hero CMS. |
| **Fase R: Restrukturisasi** | Awal Agt 2026 | ✅ **Selesai** | Transformasi folder `features/`, pemisahan `client/server/shared`, navigasi `<BackLink />`. |
| **Fase B: Backend Overhaul** | Akhir Agt 2026 | ✅ **Selesai** | Core Season & Kloter (7 fase, anti-overlap GiST), Kids Corner atomic lock, Progressive Profiling (`tanggal_lahir`, normalisasi `628...`, `nama_penerima NOT NULL`), isolasi skema `app_internal`, dan optimasi Supabase Best Practices (100% FK indexed, InitPlan RLS). |
| **Fase F: Frontend Milestones** | September 2026 | ⏳ **Siap Dimulai** | Member Hub `/app`, Ruang Belajar `/app/season/[id]/kelas`, Pengumpulan Naskah `/app/season/[id]/tugas`, Admin Grading UI, dan Progressive Bottom-Sheet Booking. |

---

## 2. Rincian Capaian Fase B (Backend Overhaul — Selesai)

### 2.1 Database & Security Architecture
- [x] **Season-Kloter Core (`20260829000000_season_kloter_core.sql`):**
  - Ekstensi `btree_gist` dan constraint anti-overlap platform-wide.
  - View `kloter_aktif (security_invoker = true)` berbasis server clock `now()`.
  - RPC atomik `setor_karya(p_file_url)` dengan penguncian `FOR UPDATE`.
- [x] **Event Sessions & Kids Corner (`20260829010000_overhaul_event_sessions_and_kids_corner.sql`):**
  - Penghapusan kolom `tipe` (fokus pada event fisik pembuka).
  - Penambahan kuota Kids Corner (0–5 anak) dan penguncian atomik di `create_booking`.
  - Penambahan role `mentor` dan `staff`.
- [x] **Performa RLS & Indexing (`20260829020000_perf_rls_initplan_and_fk_indexes.sql`):**
  - Subquery `(SELECT ...)` InitPlan caching di seluruh RLS policy.
  - 100% kolom Foreign Key diindeks dengan B-tree index.
- [x] **Progressive Profiling & Snapshot Invariant (`20260829030000_progressive_profile_and_certificate_snapshot.sql`):**
  - Penghapusan boolean kaku `profile_completed` dan constraint monolitik.
  - RPC luwes `update_profile` dengan parameter opsional `DEFAULT NULL`.
  - Penggantian `usia` statis dengan `tanggal_lahir date`.
  - Normalisasi otomatis nomor kontak WhatsApp ke `628...`.
  - Kolom `nama_penerima text NOT NULL` pada tabel `certificates` untuk mengunci nama beku saat terbit (G9).
- [x] **RLS Write & Video URL Protection (`20260830000000_fix_rls_policies_and_errcodes.sql`):**
  - Policy INSERT/UPDATE pada `video_progress`.
  - RPC `nilai_karya` dan `get_video_url` (pembatasan SELECT direct `kelas.video_url`).
  - Standardisasi kode error dan hint resmi PostgreSQL.
- [x] **Isolasi Skema `app_internal` (`20260831000000_isolate_app_internal_schema.sql`):**
  - Pemindahan helper `is_admin()` dan trigger database keluar dari skema `public` ke `app_internal` (100% tersembunyi dari HTTP PostgREST API).

### 2.2 Sisa Pekerjaan Pilar 1 (Database & Deployment)
- [ ] **Cloud Preflight & Migration Push (`supabase db push --linked`):**
  - Melakukan preflight query pada database Cloud Supabase (data 11 user & 11 booking existing).
  - Memastikan eksekusi migrasi yang menghapus kolom (`profile_completed`, `usia`, `tipe`) berjalan aman tanpa mematahkan data produksi yang sudah ada.

---

## 3. Status Spesifikasi & Content Inventory

> **Aturan Baku Pelacakan Content Inventory:** *Selalu sebutkan yang belum selesai.*  
> **Status Saat Ini:** **10 tuntas, 4 admin belum** (`/admin/season`, `/admin/kloter/[id]`, `/admin/karya`, `/admin/pembayaran`).  
> **Prasyarat Desain Milestone F.4:** Menyusun dokumen spesifikasi 5W2H untuk halaman `/admin/karya` (menentukan mekanisme pembagian beban mentor ~100 naskah dan filter karya susulan G10) sebelum coding dimulai.

---

## 4. Milestones Selanjutnya: Fase F (Frontend & User Experience)
### Milestone F.1 — State-Aware Member Hub (`/app`)
- **Tujuan:** Menjadikan `/app` sebagai beranda personal member yang merespons fase kloter aktif.
- **Fitur:**
  - Card status tiket kajian pembuka offline (jika terdaftar).
  - Banner status fase kloter berjalan (Timeline 7 fase).
  - Quick action: Lanjut Belajar, Setor Naskah, atau Unduh Sertifikat.

### Milestone F.2 — Ruang Belajar Video & Kuis (`/app/season/[id]/kelas`)
- **Tujuan:** Halaman pemutar video materi kajian berseri dan pengerjaan kuis pemahaman.
- **Fitur:**
  - Video player integrasi Bunny.net CDN via RPC `get_video_url`.
  - Kuis interaktif 1–10 soal dengan auto-grading dan submit progress via `/api/classroom/progress`.
  - Daftar modul kelas (1–6) dengan indikator kelulusan dan durasi tonton.

### Milestone F.3 — Portal Pengumpulan Naskah & Review (`/app/season/[id]/tugas`)
- **Tujuan:** Halaman setor karya tadabbur selama jendela fase `menulis_setor`.
- **Fitur:**
  - Unggah berkas dokumen fisik (.docx / .doc / .pdf) langsung ke Supabase Storage (bucket privat `karya-tulis`).
  - Pencatatan path file aman di tabel `writing_submissions` via `/api/submissions`.
  - Riwayat versi naskah (Versi 1, Versi 2, dst.).
  - Tampilan catatan & nilai dari mentor saat fase `wrapped`.

### Milestone F.4 — Antarmuka Admin & Mentor (`/admin/karya`)
- **Tujuan:** Dashboard penilaian dan peninjauan naskah peserta per kloter.
- **Fitur:**
  - Halaman Baca & Nilai Karya (`/admin/karya`) dengan filter kloter asli vs susulan (G10).
  - Panel previewer naskah terintegrasi menggunakan signed URL aman.
  - Form penilaian naskah via API `/api/admin/submissions/grade` (`nilai_karya` RPC).
### Milestone F.5 — Progressive Profiling Bottom-Sheet (Booking Kajian)
- **Tujuan:** Pengalaman pendaftaran tiket offline tanpa hambatan (*frictionless registration*).
- **Fitur:**
  - Saat user booking belum memiliki nomor WhatsApp (`TB109`), sistem memunculkan bottom-sheet/modal ringan meminta nomor WA dan jenis kelamin tanpa mengunci user di halaman onboarding kaku.
