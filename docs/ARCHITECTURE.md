# Architecture Notes — TaburBarengUB

Dokumen ini menjelaskan **di mana logika diletakkan**, **pola yang harus diikuti**, dan **alasannya**, untuk kajian offline (Fase 1) dan kelas online Season & Kloter (Fase 2).

Rincian keputusan, riwayatnya, dan yang masih terbuka ada di `docs/BACKEND.md`. Dokumen ini ringkasan polanya; kalau keduanya berbeda, `BACKEND.md` §3 yang berlaku.

---

## 1. Ringkasan & Prinsip Utama

TaburBarengUB memakai **Layered Next.js Architecture** yang berpasangan dengan **invarian yang ditegakkan database** (PostgreSQL / Supabase):

```text
               ┌─────────────────────────────────────────────────────────┐
               │                    INTERNET / CLIENT                    │
               └───────────────┬─────────────────────────┬───────────────┘
                               │                         │
                 User JWT      │                         │ Cookie session
               (authenticated) │                         │ (peserta / admin / mentor / staff)
                               ▼                         ▼
               ┌─────────────────────────┐     ┌─────────────────────────┐
               │  Supabase Client        │     │  Next.js Route Handlers │
               │  (Browser)              │     │  / Server Components    │
               └───────────────┬─────────┘     └─────────────┬───────────┘
                               │  RPC / tabel (dijaga RLS)   │  sesi pengguna yang sama
                               ▼                             ▼
    ┌────────────────────────────────────────────────────────────────────────────────────┐
    │                              POSTGRESQL DATABASE                                   │
    │                                                                                    │
    │  SCHEMA public (diekspos PostgREST)                                                │
    │  ├── Zona A — RPC peserta                                                          │
    │  │   create_booking · update_profile · setor_karya · get_video_url                 │
    │  │   get_soal_kelas · jawab_kuis · get_status_kuis · get_season_peristiwa          │
    │  ├── Zona B — RPC admin / mentor / staff (gerbang peran di dalam fungsi)           │
    │  │   nilai_karya · check_in_booking · ubah_status_season · ubah_status_kloter      │
    │  │   daftarkan_peserta · koreksi_kunci                                             │
    │  ├── Tabel — admin tulis langsung untuk aturan per baris (RLS + constraint)        │
    │  └── View  — kloter_dalam_fase · naskah_mengikat (security_invoker)                │
    │                                                                                    │
    │  SCHEMA app_internal (tersembunyi dari PostgREST)                                  │
    │  ├── Peran     is_admin · is_staff · is_penilai                                    │
    │  ├── Plug-in   boleh_menilai_naskah · status_jendela_kuis · hitung_nilai_kuis      │
    │  ├── Pembantu  hitung_skor_kuis · gerbang_kuis                                     │
    │  └── Trigger   guard_tanggal_sesi · handle_new_user · rls_auto_enable              │
    │                                                                                    │
    │  STORAGE bucket karya-tulis (private, policy memanggil plug-in yang sama)          │
    └────────────────────────────────────────────────────────────────────────────────────┘
```

Aplikasi tidak memakai service role. Satu-satunya pemanggil service role yang direncanakan adalah webhook payment gateway (`daftarkan_peserta`), yang belum dibangun.

### Prinsip dasar

1. **Satu rumah per aturan; gerbang tinggal di database.**
   Setiap keputusan "boleh atau tidak" (nonton, setor, kuis, menilai, melihat tautan) dijawab database. UI dan TypeScript **membaca** hasilnya (`get_video_url`, `get_status_kuis`, dst.), tidak menghitung ulang. Gerbang kembar di TypeScript adalah akar cacat lama — lihat `BACKEND.md` §5.1.

2. **Kaidah jalur tulis.**
   - Aturan yang cukup dijaga **per baris** → admin menulis langsung ke tabel, dijaga RLS, CHECK, dan hak per kolom.
   - Aturan yang melibatkan **baris atau tabel lain** (kuota, versi naskah, perpindahan status, skor) → RPC `SECURITY DEFINER`, dengan `FOR UPDATE` bila ada balapan.

   Keduanya sama aman karena dijaga database; API REST Supabase bisa dipanggil langsung, jadi UI tidak pernah jadi pagar.

3. **Invarian vs kebijakan.**
   - **Invarian** (arti data, harus selalu benar) → constraint, ketat.
   - **Kebijakan** (pilihan bisnis yang bisa berubah, dipakai lebih dari satu tempat) → satu fungsi *plug-in* di `app_internal`. Mengubah kebijakan = mengganti isi satu fungsi; pemanggilnya tidak disentuh.

   Tidak ada tabel konfigurasi aturan atau mesin aturan generik.

4. **Turunan tidak disimpan — kecuali fakta pada satu momen.**
   Fase kloter, status siklus season, masa penilaian, dan status kuis dihitung dari tanggal saat dibaca. Yang disimpan hanya yang tidak bisa direkonstruksi atau tidak boleh berubah surut: undian soal, jenis kepemilikan season, nama di sertifikat.

5. **Progressive profiling.**
   Tidak ada boolean global `profile_completed`. Data profil diminta sesuai kebutuhan aksi (misalnya `no_hp` saat memesan tiket).

---

## 2. Struktur Layer & Tanggung Jawab

| Layer | Lokasi | Tanggung jawab |
|---|---|---|
| **Presentation** | `src/app/**/page.tsx`, `src/components/ui/*` | Server Components: rendering, fetching awal, layout, navigasi |
| **Client Interaction** | `src/features/*/client/*` (`'use client'`) | State interaktif, event handler form, umpan balik visual |
| **API Controller** | `src/app/api/**/route.ts` | Validasi Zod, autentikasi sesi, menerjemahkan hint RPC ke status HTTP |
| **Service** | `src/features/*/server/*` | Query Supabase dan pemanggilan RPC. Tidak menghitung gerbang |
| **Shared** | `src/features/*/shared/*` | Tipe DTO, Zod schema, label tampilan |
| **Database** | `supabase/migrations/*` | Skema, RLS, constraint, GiST, RPC, plug-in, bucket |
| **Tes database** | `supabase/tests/*.test.sql` | Tes perilaku pgTAP (`supabase test db`), jalan di CI |

Error dari RPC dicocokkan lewat **hint** (`KUIS_SUDAH_DIJAWAB`, `JENDELA_SETOR_TERTUTUP`, …), tidak pernah lewat teks pesan.

---

## 3. Domain Season & Kloter (Fase 2)

### 3.1 Hierarki

- **1 kaidah = 1 season** (±1 tahun). **1 season = beberapa kloter** (±2 bulan) + **6 kelas** (video).
- **Kloter punya 5 tanggal batas (b1–b5) → 4 fase berjadwal:**

  ```text
  b1 ── pendaftaran ── b2 ── orientasi ── b3 ── menyimak ── b4 ── menulis_setor ── b5 ══ masa penilaian ══ wrapped
  ```

  `orientasi` boleh berdurasi nol (b2 = b3); fase lain tidak.
- **Status kloter: 3 nilai** — `draft`, `berjalan`, `wrapped`. `wrapped` dicapai lewat aksi admin, bukan tanggal.
- **Bukan fase:** `offline` (acara di `event_sessions`), `antara_kloter` (keadaan platform di celah antar kloter), `wrapped` (keadaan akhir), masa penilaian (turunan: `status = 'berjalan'` dan sudah lewat b5).
- **Status season** diturunkan: `terbit` (keputusan editorial, disimpan) + tanggal → `draft` / `akan_datang` / `berjalan` / `selesai`, lewat computed field `status_siklus`.
- **Kepemilikan season** punya jenis: `bimbingan` (punya kloter asal) atau `arsip` (dibeli setelah season selesai; video dan rekaman saja).

### 3.2 Anti-overlap dan kloter dalam fase

- Maksimal satu kloter berjadwal platform-wide. Yang dikunci hanya `[b1, b5)`; masa penilaian boleh tumpang tindih dengan kloter berikutnya. Kloter `draft` dikecualikan supaya jadwal tentatif bisa disiapkan.

  ```sql
  CONSTRAINT kloter_tidak_overlap EXCLUDE USING gist (
    tstzrange(tanggal_mulai, tgl_tenggat_setor, '[)') WITH &&
  ) WHERE (status <> 'draft')
  ```

- View `kloter_dalam_fase` memberi kloter yang sedang di salah satu dari empat fase, beserta nama fasenya. Unik berkat constraint di atas; kosong di celah antar kloter.
- **Override fase = geser tanggal.** Tidak ada flag override; tombol "maju fase" di UI mengisi batas berikutnya dengan `now()`. Kloter `wrapped` tidak bisa diubah jadwalnya.

### 3.3 Gerbang

| Pertanyaan | Bentuk | Sumber |
|---|---|---|
| Boleh nonton video? | **ambang** — sekali buka, permanen | `bimbingan`: sejak b3 kloter asal. `arsip`: langsung. RPC `get_video_url` |
| Boleh setor naskah? | **jendela** `[b4, b5)` | kloter dalam fase; berkas wajib di folder penyetor. RPC `setor_karya` |
| Boleh jawab kuis? | **jendela** kloter asal, sekali saja | plug-in `status_jendela_kuis` (sekarang `[b3, b4)`); hanya `bimbingan` |
| Naskah ini dinilai? | versi terakhir di kloter asal | view `naskah_mengikat` |
| Boleh baca/nilai naskah? | plug-in | `boleh_menilai_naskah` (sekarang: admin + semua mentor); pemilik boleh baca |
| Boleh lihat livestream & rekaman? | kepemilikan season, tanpa waktu | RPC `get_season_peristiwa` |

"Video = ambang, setor dan kuis = jendela" — bentuk gerbang yang berbeda, jangan tertukar. Gerbang tidak pernah membaca nama fase; keduanya diturunkan dari tanggal yang sama lewat jalur berbeda.

### 3.4 Naskah dan penilaian

- `writing_submissions.kloter_id` mencatat **kloter yang jendelanya terbuka saat setor**, bukan kloter asal penulis. `versi` bertambah per `(user_id, kloter_id)`.
- Naskah **mengikat** = versi terakhir di kloter asal; selain itu latihan (disimpan, tidak dinilai). Satu-satunya definisi ada di view `naskah_mengikat`.
- `nilai_karya` hanya menerima naskah mengikat, setelah b5, selama kloter belum ditutup. `ubah_status_kloter('selesaikan')` ditolak selama ada naskah mengikat yang belum dinilai.
- Bucket `karya-tulis`: private, PDF/DOC/DOCX maks 10 MB, peserta hanya mengunggah ke foldernya sendiri, tidak bisa menimpa atau menghapus. Signed URL dibuat Storage API; policy-nya memanggil plug-in yang sama dengan tabel.

### 3.5 Kuis

- Bank soal per kelas (`soal`), lebih besar dari yang ditampilkan (`kelas.jumlah_soal_tampil`). Undian per peserta disimpan (`kuis_peserta.soal_terpilih`) saat kuis pertama dibuka; kuis belum bisa dibuka selama bank kurang.
- Isi soal beku; hanya `aktif` yang bisa diubah langsung. Kunci yang salah dikoreksi lewat `koreksi_kunci`, yang menghitung ulang skor terdampak.
- `skor` = jumlah benar, dihitung DB. Nilai kuis raport dihitung plug-in `hitung_nilai_kuis`. Skor tidak dikirim ke peserta.
- Progres tontonan tidak dilacak; "sudah selesai" = kuisnya sudah dijawab.

### 3.6 Jalur tulis admin

| Operasi | Jalur |
|---|---|
| Season, kloter (jadwal, kapasitas, livestream), kelas, soal, rekaman sesi | tulis langsung; RLS admin + CHECK + hak per kolom |
| Status season (terbitkan, tutup) dan kloter (publikasikan, selesaikan) | `ubah_status_season`, `ubah_status_kloter` — kolom statusnya tidak bisa ditulis langsung |
| Pendaftaran peserta | `daftarkan_peserta` (admin, nanti juga webhook pembayaran) |
| Nilai naskah, koreksi kunci | `nilai_karya`, `koreksi_kunci` |

Peran: `admin` memegang semua konten; `mentor` hanya menilai dan tidak pernah melihat kunci soal; `staff` hanya scan tiket.

---

## 4. Domain Kajian Offline & Booking (Fase 1)

### 4.1 `event_sessions`
- Khusus kajian offline fisik. Terhubung opsional ke kloter lewat `kloter_id`.
- `rekaman_url` menyimpan rekaman acara; kolomnya rahasia dan dibaca lewat `get_season_peristiwa`.

### 4.2 Kids Corner & dual-counter
- Kuota dewasa (`kapasitas`, `kuota_terisi`) dan Kids Corner (`kapasitas_kids`, `kuota_kids_terisi`). Satu booking membawa 0–5 anak.
- `create_booking(p_session_id, p_jumlah_anak)` mengunci baris sesi (`FOR UPDATE`) dan memperbarui kedua counter dalam satu transaksi. Kolom counter tidak bisa diubah langsung oleh klien.

---

## 5. Model Data

### 5.1 `public.users`
- **Identitas:** `id uuid PK (FK auth.users)`, `email UNIQUE`, `role IN ('user','admin','mentor','staff')`.
- **Profil:** `nama` (nama resmi, dicetak di sertifikat), `nama_panggilan`, `no_hp` (dinormalkan ke `628…`), `jenis_kelamin IN ('ikhwan','akhwat')`, `tanggal_lahir` (umur dihitung, tidak disimpan), `profesi`, `domisili`.
- Ditulis hanya lewat trigger `handle_new_user` dan RPC `update_profile`.

### 5.2 Snapshot saat terbit (G9)
- `certificates.nama_penerima` dibekukan saat terbit; perubahan profil tidak mengubah sertifikat lama.
- Pola yang sama berlaku untuk raport: nilai kuis dan rubrik akan disalin saat terbit, bukan dirujuk. Kolomnya menunggu desain raport (`BACKEND.md` §4.1).

---

## 6. Keamanan & Kepatuhan

1. **RLS di semua tabel publik**, diaktifkan otomatis untuk tabel baru oleh event trigger `ensure_rls`.
2. **RLS InitPlan:** policy membungkus `auth.uid()` dan helper peran dalam `(SELECT …)` supaya dievaluasi sekali per query. Pengecualian: `boleh_menilai_naskah(file_url)` menerima kolom, jadi dievaluasi per baris — plug-in ini wajib tetap ringan.
3. **Kolom rahasia** (`kelas.video_url`, `kloters.livestream_url`, `event_sessions.rekaman_url`, seluruh tabel `soal`) tidak bisa di-SELECT klien; disajikan lewat RPC bergerbang.
4. **Indeks untuk setiap foreign key.**
5. **Search path eksplisit** di setiap fungsi `SECURITY DEFINER`.
6. **Least privilege:** helper dan plug-in di `app_internal`, tidak terjangkau PostgREST. RPC tidak bisa dipanggil `anon`.
7. **Verifikasi:** `supabase db lint`, `supabase db advisors`, dan `supabase test db` bersih sebelum merge.
