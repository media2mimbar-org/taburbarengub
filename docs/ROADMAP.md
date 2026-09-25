# Roadmap — TaburBarengUB

> **Status Proyek:** Menuju Peluncuran Penuh (Web & Native Android Ready)  
> **Diperbarui:** 2026-09-25 (baseline season/kloter diterapkan, CI hijau)  
> **Branch Aktif:** `rombak/backend` (tersinkronisasi ke remote)

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
| **Fase B: Backend Overhaul** | Akhir Agt – Sep 2026 | ✅ **Selesai** | Agt: Kids Corner atomic lock, Progressive Profiling, isolasi `app_internal`, best practices Supabase. **25 Sep: 18 migrasi digabung jadi satu baseline** dengan model kloter b1–b5 (4 fase turunan), kepemilikan bimbingan/arsip, bank soal + kuis sekali jawab, akses naskah plug-in, dan tes pgTAP di CI. Rincian: `docs/BACKEND.md`. |
| **Fase F: Frontend Milestones** | September 2026 | ⏳ **Siap Dimulai** | Member Hub `/app`, Ruang Belajar `/app/season/[id]/kelas`, Pengumpulan Naskah `/app/season/[id]/tugas`, Admin Grading UI, dan Progressive Bottom-Sheet Booking. |

---

## 2. Rincian Capaian Fase B (Backend Overhaul — Selesai)

> Bagian 2.1 adalah catatan historis per migrasi Agustus. **Semua migrasi itu sudah digabung ke `supabase/migrations/20260925000000_baseline.sql`** (lihat 2.2); nama file di bawahnya tidak ada lagi di repo.

### 2.1 Database & Security Architecture (Agustus, historis)
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

### 2.2 Baseline 25 Sep (`20260925000000_baseline.sql`)
- [x] `kloters` menyimpan lima batas b1–b5 + `status`; `kloter_phases` dan view `kloter_aktif` dihapus, diganti `kloter_dalam_fase` dan `naskah_mengikat`.
- [x] `seasons.status` dipecah jadi `terbit` + turunan `status_siklus`.
- [x] `user_seasons.jenis` (`bimbingan`/`arsip`); RPC `daftarkan_peserta` menegakkan kapasitas.
- [x] Bank soal, undian tersimpan, kuis sekali jawab dengan skor dihitung DB, `koreksi_kunci`.
- [x] Gerbang video diperbaiki (pemilik arsip dan anggota kloter lama tidak lagi terkunci); "selesaikan kloter" tidak macet oleh naskah latihan; skor kuis tidak lagi dikirim klien.
- [x] Bucket privat `karya-tulis` dengan policy per folder; akses mentor lewat plug-in `boleh_menilai_naskah`.
- [x] 56 tes pgTAP (`supabase test db`) jalan di CI.

### 2.3 Sisa Pekerjaan Pilar 1 (Database & Deployment)
- [ ] **Deploy ke Supabase Cloud — ditunda.** Cloud masih berskema Fase 1 dengan akun tester. Rencana: ekspor akun → reset → baseline → impor ulang (`docs/BACKEND.md` §4.5). Sampai itu, jangan jalankan `db:push`.

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
  - Banner fase kloter (4 fase berjadwal + masa penilaian), dibaca dari `kloter_dalam_fase`; mode layar mengikuti `docs/BACKEND.md` §3.3.
  - Quick action: Lanjut Belajar, Setor Naskah, atau Unduh Sertifikat.

### Milestone F.2 — Ruang Belajar Video & Kuis (`/app/season/[id]/kelas`)
- **Tujuan:** Halaman pemutar video materi kajian berseri dan pengerjaan kuis pemahaman.
- **Fitur:**
  - Video player integrasi Bunny.net CDN via RPC `get_video_url`.
  - Kuis 3–5 soal per kelas, diundi dari bank soal, satu kali jawab, via `/api/classroom/kuis`; hanya terbuka selama fase menyimak kloter asal.
  - Daftar modul kelas (1–6) dengan status kuis dari `get_status_kuis`. Progres tontonan tidak dilacak (batasan iframe Bunny).

### Milestone F.3 — Portal Pengumpulan Naskah & Review (`/app/season/[id]/tugas`)
- **Tujuan:** Halaman setor karya tadabbur selama jendela fase `menulis_setor`.
- **Fitur:**
  - Unggah berkas dokumen fisik (.docx / .doc / .pdf) langsung ke Supabase Storage (bucket privat `karya-tulis`).
  - Pencatatan path file aman di tabel `writing_submissions` via `/api/submissions`.
  - Riwayat versi naskah (Versi 1, Versi 2, dst.).
  - Tampilan catatan & nilai dari mentor setelah kloter ditutup (`wrapped`).

### Milestone F.4 — Antarmuka Admin & Mentor (`/admin/karya`)
- **Tujuan:** Dashboard penilaian dan peninjauan naskah peserta per kloter.
- **Fitur:**
  - Halaman Baca & Nilai Karya (`/admin/karya`) berbasis view `naskah_mengikat` (naskah latihan tidak masuk antrean). Pembagian mentor menunggu D4; sementara semua mentor bisa menilai semua naskah.
  - Panel previewer naskah terintegrasi menggunakan signed URL aman.
  - Form penilaian naskah via API `/api/admin/submissions/grade` (`nilai_karya` RPC, terbuka setelah tenggat setor).
### Milestone F.5 — Progressive Profiling Bottom-Sheet (Booking Kajian)
- **Tujuan:** Pengalaman pendaftaran tiket offline tanpa hambatan (*frictionless registration*).
- **Fitur:**
  - Saat user booking belum memiliki nomor WhatsApp (`TB109`), sistem memunculkan bottom-sheet/modal ringan meminta nomor WA dan jenis kelamin tanpa mengunci user di halaman onboarding kaku.
