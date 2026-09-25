# Backend TaburBarengUB — Keadaan, Keputusan, dan Yang Belum Selesai

> Disusun **2026-09-05**, diverifikasi terhadap branch `rombak/backend` commit `4135a14`.
> Direvisi **2026-09-06** menutup B1–B5, H10, dan H11 dari `docs/REVIEW_BACKEND_TEMUAN.md`, plus keputusan D1–D6, A3b, penempatan dua peristiwa kloter, dan desain bank soal.
> Direvisi **2026-09-25**: hasil preflight cloud, pembeli arsip dan jenis kepemilikan, pendaftaran peserta, akses naskah, kaidah jalur tulis admin, kuis jadi jendela, dan penggabungan migrasi jadi satu baseline.
> **Diterapkan 2026-09-25** di commit `750ae31` (baseline), `63aeeed` (kode aplikasi), `32b3c33` (tes pgTAP). CI hijau.
>
> **Penanda kebasian:** §3.11 diverifikasi lewat katalog PostgreSQL lokal pada `9f8b650` (13 tabel, RLS 13/13, 2 view, 14 RPC publik, 11 fungsi `app_internal`). Kalau ada migrasi baru, §3.11 harus diverifikasi ulang. §1 sengaja dibiarkan sebagai potret **sebelum** baseline.

## 0. Cara membaca dokumen ini

| Bagian | Isinya |
|---|---|
| §1 | Keadaan **sebelum** baseline (commit `4135a14`) — dipertahankan sebagai sisi "before" |
| §2 | Kerangka berpikir yang memandu keputusan — pembedaan dan uji lakmus |
| §3 | Keputusan yang terkunci, **sudah diterapkan** di baseline kecuali yang ditandai tertahan. §3.11 = skema sekarang |
| §4 | Apa yang **masih bolong**, dikelompokkan menurut siapa yang bisa menutupnya |
| §5 | Cacat yang ditemukan sebelum baseline — **sudah ditutup** |
| §6 | Bagian dokumen lain yang jadi basi karena §3 |
| §7 | Urutan pengerjaan |
| §8 | Test yang mengikat keputusan — hidup di `supabase/tests/baseline.test.sql` |

Untuk melihat **before-after** skema, baca §1.2–§1.4 lalu §3.11 — keduanya sengaja disusun dengan struktur yang sama.

Klaim yang belum dibuktikan dengan eksekusi ditandai `[INFERENCE]`. Jangan diperlakukan sebagai fakta sebelum ada test yang membuktikan.

Hubungan dengan dokumen lain:
- `docs/REVIEW_BACKEND_TEMUAN.md` — temuan gabungan tiga review atas dokumen ini, plus verifikasi lima premis langsung ke migrasi. Sumber B1–B5, H1–H12, S1–S10.
- `docs/ARCHITECTURE.md` — ringkasan pola & tempat logika. Disinkronkan dengan baseline 25 Sep; kalau berbeda, §3 dokumen ini yang berlaku.
- `docs/REVIEW_ACTION_TRACKER.md` — sumber status aktual. Item yang mulai dikerjakan dipromosikan jadi entri `PR-17` dan seterusnya di sana.
- Notion `Content Inventory` — spesifikasi 5W2H per halaman, sumber kebenaran untuk isi layar.
- Notion `Pertanyaan Terbuka` — daftar pertanyaan untuk tim media / Mas Titian / Ustadz Budi.

---

## 1. Keadaan sebelum baseline (commit `4135a14`)

> Potret historis. Semua yang di bawah ini sudah digantikan baseline 25 Sep; keadaan sekarang ada di §3.11.

### 1.1 Toolchain

- Branch `rombak/backend`, commit `4135a14`, sinkron dengan origin.
- Next.js 16.2.11 (Turbopack), React 19.2.4, Node 22 LTS, TypeScript 5.
- PostgreSQL 17 via Supabase CLI (lokal Docker, `http://127.0.0.1:54321`).
- 18 file migrasi di `supabase/migrations/`.
- 66 test (16 suite: 59 unit + 7 live RPC) lulus di lokal dan CI.
- CI: `.github/workflows/ci.yml`, Supabase CLI disematkan `2.109.1`, container stack ramping, env DB dioverride per-step.
- Proyek terhubung ke cloud Supabase (`supabase/.temp/project-ref` ada). Isinya skema Fase 1 + akun tester; 18 migrasi belum pernah dijalankan di sana — §4.5.

### 1.2 Skema `public` — 13 tabel, 1 view

Terverifikasi lewat `information_schema.tables`.

**Domain Season & Kloter**

| Tabel | Catatan |
|---|---|
| `seasons` | `nomor_kaidah`, `nama`, `tanggal_mulai`, `tanggal_selesai NULL`, `status ('draft'\|'berjalan'\|'selesai')`. **`status` akan dipecah — §3.2** |
| `kloters` | `season_id`, `nomor`, `tanggal_mulai NOT NULL`, `tanggal_selesai NULL`, `kapasitas`. Constraint `kloter_tidak_overlap`. Tidak punya kolom `status` |
| `kloter_phases` | `kloter_id`, `phase`, `opens_at`, `closes_at`, `override_active/_by/_at`. Constraint `fase_tidak_overlap`. **Akan diruntuhkan — §3.2** |
| `kelas` | `season_id`, `nomor`, `judul`, `video_url`. `video_url` dicabut dari SELECT publik |
| `kloter_mentors` | `kloter_id`, `mentor_id`, unik per pasangan |
| `user_seasons` | `user_id`, `season_id`, `kloter_daftar_id NOT NULL`, `sumber ('beli'\|'gratis')` |
| `video_progress` | `user_id`, `kelas_id`, `ditonton`, `jawaban_soal jsonb`, `skor` |
| `writing_submissions` | `user_id`, `kloter_id NOT NULL`, `versi`, `file_url`, `status ('menunggu'\|'dinilai')`, `nilai jsonb`, `created_at` |
| `certificates` | `user_id`, `user_season_id`, `jenis ('lulus'\|'ikut_serta') NOT NULL`, `nama_penerima text NOT NULL`, `issued_at` |

**Domain Pengguna & Kajian Offline**

| Tabel | Catatan |
|---|---|
| `users` | `email`, `nama`, `nama_panggilan`, `no_hp`, `jenis_kelamin`, `tanggal_lahir date`, `profesi`, `domisili`, `role ('user'\|'admin'\|'mentor'\|'staff')` |
| `event_sessions` | `nama_sesi`, `tanggal_waktu`, `lokasi_atau_link`, `kapasitas`, `kuota_terisi`, `kapasitas_kids NOT NULL DEFAULT 0`, `kuota_kids_terisi NOT NULL DEFAULT 0`, `status`, `kloter_id` |
| `bookings` | `user_id`, `session_id`, `qr_token`, `jumlah_anak CHECK 0..5`, `status ('booked'\|'checked_in'\|'cancelled')`, `checked_in_at` |
| `hero_content` | singleton `CHECK (id = 1)`. Tidak dibahas lagi di dokumen ini — S6 |

**View `kloter_aktif`**

`WITH (security_invoker = true)`. Definisi terverifikasi lewat `pg_get_viewdef`:

```sql
SELECT k.*, COALESCE(
         (SELECT phase FROM kloter_phases WHERE kloter_id = k.id AND override_active),
         (SELECT phase FROM kloter_phases WHERE kloter_id = k.id
            AND now() >= opens_at AND now() < closes_at)
       ) AS fase
FROM kloters k JOIN seasons s ON s.id = k.season_id
WHERE k.tanggal_mulai <= now()
  AND COALESCE(k.tanggal_selesai, 'infinity') > now()
  AND s.status = 'berjalan'
ORDER BY k.tanggal_mulai DESC
LIMIT 1;
```

Tiga sifat yang penting dan sering disalahpahami:

1. **`ORDER BY` ada.** Jadi saat dua kloter memenuhi filter, view **selalu** memilih yang paling baru mulai — bukan nondeterministik, tapi salah yang konsisten dan berulang tiap siklus. Ini akar B1.
2. **Definisi "aktif"-nya rentang tanggal kloter**, bukan rentang fase. Kloter tanpa baris `kloter_phases` yang cocok tetap lolos filter dan mengembalikan `fase = NULL`.
3. **Menyaring `seasons.status`, tidak pernah membaca status kloter** (yang belum ada). Artinya presedensi "season menang" sudah berlaku di kode tanpa pernah jadi keputusan sadar — diselesaikan di §3.2.

### 1.3 Constraint yang menegakkan invarian

Terverifikasi lewat `pg_constraint`:

```sql
-- kloters: maksimal 1 kloter aktif platform-wide
EXCLUDE USING gist (
  tstzrange(tanggal_mulai, COALESCE(tanggal_selesai, 'infinity'), '[)') WITH &&
)

-- kloter_phases: fase dalam satu kloter tak boleh tumpang tindih
EXCLUDE USING gist (
  kloter_id WITH =,
  tstzrange(opens_at, closes_at, '[)') WITH &&
)
```

`fase_tidak_overlap` hanya melarang tumpang tindih — **celah antar fase legal** di data yang ada. Itu yang membuat backfill B5 butuh kebijakan eksplisit (§3.2).

Keduanya butuh extension `btree_gist` (dipasang di skema `extensions`).

### 1.4 Peta fungsi — 7 RPC publik, 6 helper internal

Terverifikasi lewat `pg_proc`. Semua `SECURITY DEFINER`.

**Zona A — RPC peserta (`authenticated`)**

| RPC | Argumen | Invarian |
|---|---|---|
| `create_booking` | `p_session_id uuid, p_jumlah_anak integer` | `FOR UPDATE` sesi; validasi `no_hp` (`TB109`), 0–5 anak (`TB107`), kuota dewasa (`TB103`), kuota kids (`TB108`) |
| `update_profile` | 7 argumen opsional | Mutasi hanya baris `auth.uid()`; normalisasi WA `628…`; menolak `role`/`email` |
| `setor_karya` | `p_file_url text` | Kepemilikan season **kloter aktif** + fase `menulis_setor`; regex anti-traversal; auto-increment `versi` per `(user_id, kloter_id)` |
| `get_video_url` | `p_kelas_id uuid` | Kepemilikan season `kelas` + gerbang fase kloter aktif. **Cacat berjalan — §5.1** |
| `submit_classroom_progress` | `p_kelas_id, p_watched_seconds, p_quiz_answers, p_quiz_score` | Kepemilikan season `kelas` + gerbang fase kloter aktif. **`p_quiz_score` dari klien — §5.3** |

**Dua bacaan "kepemilikan season" hidup bersamaan di repo ini.** `setor_karya` mengukur kepemilikan terhadap season **kloter aktif**; `get_video_url` dan `submit_classroom_progress` mengukurnya terhadap season **`kelas` yang diminta**, tanpa syarat kloter aktif. Diselesaikan di §3.4.

**Zona B — RPC admin/mentor (gerbang peran di dalam fungsi)**

| RPC | Argumen | Gerbang |
|---|---|---|
| `nilai_karya` | `p_submission_id uuid, p_nilai jsonb` | `is_mentor_for_kloter()` atau `is_admin()`; `FOR UPDATE` |
| `check_in_booking` | `p_qr_token text` | `is_staff()`; `FOR UPDATE` anti-double-scan |

**Zona C — `app_internal`, tersembunyi dari PostgREST**

`is_admin()`, `is_staff()`, `is_mentor_for_kloter(p_kloter_id uuid)`, `guard_tanggal_sesi()`, `handle_new_user()`, `rls_auto_enable()`.

Event trigger `ensure_rls` `ON ddl_command_end` memanggil `app_internal.rls_auto_enable()` — mengaktifkan RLS otomatis pada tabel `public` yang baru dibuat.

**Yang tidak ada di peta ini** (H8): jalur pendaftaran season, yaitu write ke `user_seasons`. Tidak ada RPC untuknya. Selama jalurnya insert manual admin atau service-role, dua invarian tidak ditegakkan di DB mana pun: `kloters.kapasitas`, dan aturan `kloter_daftar_id = kloter aktif saat mendaftar` yang jadi pijakan seluruh §3.5. Diselesaikan di §3.8.

### 1.5 Kepatuhan yang sudah tercapai

- 13/13 tabel publik `rowsecurity = true`.
- 100% foreign key terindeks B-tree (0 unindexed FK).
- Semua policy RLS memakai `(SELECT auth.uid())` / `(SELECT app_internal.is_admin())` untuk InitPlan caching.
- Semua `SECURITY DEFINER` menyetel `SET search_path`.
- `supabase db advisors --local` dan `db lint --local`: 0 temuan.

Catatan: 0 temuan advisors **tidak** berarti bebas cacat logika. §5.1 dan §5.2 adalah cacat berjalan yang lolos semua linter, karena keduanya soal *kloter mana yang dirujuk*, bukan soal hak akses atau performa.

---

## 2. Kerangka berpikir

### 2.1 Tiga pekerjaan yang tercampur di `phase_type`

Akar hampir semua kerumitan di domain kloter:

| Pekerjaan | Kalau salah | Toleransi |
|---|---|---|
| Menegakkan gerbang (boleh nonton/setor) | Data bocor atau akses tertutup salah | Nol — fail-closed |
| Memilih mode layar | User lihat layar keliru | Boleh — degradasi anggun |
| Label teks | Tulisan salah | Boleh |

Keputusan Notion 26 Agt menempatkan enum di pekerjaan kedua: *"fase cukup enum tetap di kode; yang disimpan per kloter adalah tanggal batas tiap fase."* Implementasi menyimpang — enum ikut jadi kolom di `kloter_phases`, dan gerbang ikut mengonsultasinya.

### 2.2 Empat pembedaan

**Batas vs rentang.** Fase bersambung tanpa celah, jadi satu tanggal melayani dua fase (tutup yang lama = buka yang baru). `kloter_phases` menyimpan rentang, sehingga setiap batas tersimpan dua kali — dari duplikasi itu `fase_tidak_overlap` jadi ranjau saat penggeseran jadwal.

**Ambang vs jendela.** Video = ambang (sekali buka, permanen, termasuk pemilik arsip). Setor = jendela (buka lalu tutup). Fase `menyimak` berakhir di batas b4, tapi akses video tidak — bukti bahwa fase ≠ gerbang.

**System-state vs user-state.** Karena `kloter_tidak_overlap` menjamin maksimal satu kloter dalam fase, fase keanggotaan punya satu nilai yang sama untuk semua orang. Yang per-user hanya satu boolean: `kloter_daftar_id == kloter_dalam_fase.id`.

**Disimpan vs diturunkan.** Disimpan hanya kalau tidak bisa dihitung dari apa pun. Turunan yang disimpan pasti basi.

### 2.3 Lima uji lakmus

Dijalankan pada setiap usulan:

1. **Uji akibat** — kalau nilai ini salah, data bocor atau cuma layar keliru? Menentukan gerbang vs presentasi.
2. **Uji turunan** — bisa dihitung dari tabel yang sudah ada? Kalau ya, jangan simpan.
3. **Uji keseragaman** — dua user pada momen sama bisa lihat nilai beda? Kalau tidak, ini system-state.
4. **Uji geser** — panitia menggeser satu tanggal: berapa baris harus ikut berubah? Satu = sehat.
5. **Uji arsip** — pemilik season lampau masih bisa? Uji yang paling sering menangkap bug, karena season arsip tidak punya kloter dalam fase.

Uji nomor 5 menangkap §5.1 dari pembacaan dokumen saja, tanpa menjalankan apa pun. Itu contoh terbaik kenapa daftar ini ada.

### 2.4 Invarian vs kebijakan

Yang membuat logika di database susah diubah bukan letaknya — mengganti fungsi cuma satu migrasi `CREATE OR REPLACE`, tanpa menyentuh data. Yang mahal ada dua: **bentuk data** (mengubahnya berarti memindahkan baris yang sudah ada) dan **aturan yang tersebar** (ditulis di beberapa tempat, lalu salah satunya lupa diubah — §5.1 persis ini). Obatnya bukan melonggarkan, tapi memastikan tiap aturan punya satu rumah.

| Jenis | Contoh | Perlakuan |
|---|---|---|
| **Invarian** — arti data, harus selalu benar | urutan b1–b5, arsip ⇔ kloter kosong, satu kali per season, kunci menunjuk pilihan | constraint, ketat, tertanam dalam. Membuatnya bisa diganti mengundang data yang tidak masuk akal |
| **Kebijakan** — pilihan bisnis yang bisa berubah | siapa penilai, rumus nilai, kapan kuis buka | satu fungsi bernama (plug-in) di `app_internal` |

Uji untuk menjadikan sesuatu plug-in: **mungkin berubah karena keputusan bisnis, dan dipanggil lebih dari satu tempat?** Dua-duanya ya → fungsi. Pemanggilnya cuma satu → RPC itu sendiri sudah "satu rumah"; mengekstraknya cuma menambah lapisan.

Dua batas:

- **UI membaca gerbang dari DB, tidak menghitung ulang.** Setiap gerbang yang dihitung ulang di TypeScript adalah kembaran diam-diam dari plug-in-nya.
- **Tidak ada tabel konfigurasi aturan atau mesin aturan generik.** Aturan pindah dari kode yang bisa dibaca dan dites ke data yang bisa diubah tanpa jejak.

Fungsi plug-in yang dipanggil dari RLS dijalankan per baris: harus `STABLE`, ringan, dan dibungkus `(SELECT ...)` supaya di-cache sebagai InitPlan.

---

## 3. Keputusan terkunci — diterapkan di baseline 25 Sep

### 3.1 Daftar keputusan

| Keputusan | Sumber |
|---|---|
| Urutan fase tetap; durasinya berubah. Enum di kode, tanggal batas di data | Notion 26 Agt |
| Video = ambang, setor = jendela — dua bentuk gating berbeda | Notion 26 Agt |
| Live stream penutup fase menyimak disiarkan lewat YouTube; web hanya menyimpan tautan | Notion, batch Mas Titian 20 Agt |
| Jadwal & tautan live stream melekat di **kloter**, bukan season. 6 video kelas melekat di season | Notion 26 Agt (Adam) |
| Hak menonton live stream ditentukan **kepemilikan season**, bukan keanggotaan kloter | Notion 26 Agt, dikonfirmasi Mas Titian |
| Kloter serial; pendaftaran dibuka tepat setelah kajian offline selesai | Sesi 5 Sep (A.1) |
| Keadaan akhir `wrapped` dicapai lewat aksi admin, bukan tanggal; masa penilaian sebelum itu berdurasi dinamis | Sesi 5 Sep (A.1) |
| Sertifikat ditahan sampai seluruh naskah mengikat dinilai | Sesi 5 Sep (A.3) |
| Cukup indikator visual, tanpa auto-wrap | Sesi 5 Sep (B.2) |
| `orientasi` = jeda masa persiapan, bukan acara. Satu batas tanggal, tanpa URL | Sesi 5 Sep |
| `offline` diturunkan dari `event_sessions` — nol konsumen unik sebagai nilai fase | Sesi 5 Sep |
| Nilai **tidak** menentukan kelulusan. Semua peserta lulus | Update tim, 5 Sep |
| Sertifikat memuat nilai → berbentuk raport dengan catatan evaluasi | Update tim, 5 Sep |
| Nilai kuis = akumulasi seluruh soal pilihan ganda satu season, sempurna 100 | Update tim, 5 Sep |
| Nilai karya = rubrik bahasa (A/B/C) + konten (A/B/C) | Update tim, 5 Sep |
| Penilaian hanya di kloter asal user | Sesi 5 Sep |
| Nilai karya = versi terakhir di kloter asal | Sesi 5 Sep |
| Setoran di jendela kloter lain diterima, tapi tidak dinilai | Sesi 5 Sep |
| Setor hanya saat jendela terbuka | Sesi 5 Sep |
| Nilai kuis ikut ditahan selama masa penilaian — raport satu dokumen utuh | Sesi 5 Sep |
| `wrapped` bukan fase, melainkan keadaan akhir | Sesi 5 Sep |
| Target masa penilaian = target internal admin, QoL, tidak pernah ke peserta | Sesi 5 Sep |
| **D3:** kloter N+1 boleh dibuka sebelum kloter N di-`wrap`. GiST mengunci `[b1, b5)` | Sesi 5 Sep |
| **D5:** fase berdurasi nol dilarang, kecuali `b2 = b3` (orientasi boleh nol) | Sesi 5 Sep |
| **D6:** `writing_submissions.kloter_id` tetap mencatat **kloter jendela**, bukan kloter asal | Sesi 5 Sep |
| **D1:** `seasons.status` dipecah — editorial (`terbit`) dipisah dari siklus hidup (turunan tanggal) | Sesi 5 Sep |
| **A3b:** penutupan season mensyaratkan tidak ada kloter yang sedang berjalan | Sesi 5 Sep |
| **D2:** perbaikan §5.1 + H1 dilipat ke paket migrasi §3.2, tidak dikerjakan terpisah | Sesi 5 Sep |
| **Rekaman sesi offline** disimpan di `event_sessions.rekaman_url` (opsi A), bukan di `kloters` | Sesi 6 Sep |
| **Gerbang peristiwa** (livestream & rekaman offline) = kepemilikan season, **tanpa komponen waktu** | Sesi 6 Sep, mengikuti Notion 26 Agt |
| **Soal melekat di `kelas`** (level season), berbeda antar video. Bukan per kloter | Sesi 6 Sep |
| **Bank soal:** tiap kelas punya lebih banyak soal daripada yang ditampilkan; yang ditampilkan diundi per peserta | Sesi 6 Sep |
| **Undian soal disimpan** per (peserta, kelas), bukan diturunkan ulang | Sesi 6 Sep |
| **Kuis satu kesempatan.** Sekali kirim, jawaban final | Sesi 6 Sep |
| **Progres tontonan diturunkan** dari status jawaban kuis, tidak dilacak sendiri | Sesi 6 Sep |
| **Kuis = jendela kloter asal**, bukan ambang. Membalik keputusan 6 Sep | Sesi 25 Sep |
| **Jendela kuis = fase menyimak `[b3, b4)`**: kuis dikerjakan setelah menonton, tutup saat fase setor mulai. Lewat plug-in, jadi bisa diubah | Sesi 25 Sep |
| **Pembeli arsip** mendapat video dan rekaman saja. Tanpa bimbingan, kuis, setor, raport | Sesi 25 Sep, sesuai Notion |
| **Jenis kepemilikan** (`bimbingan`/`arsip`) dicatat saat mendaftar, ditentukan status season saat itu. Arsip = produk berbeda (harga lain) | Sesi 25 Sep |
| Pendaftaran bimbingan hanya di fase `pendaftaran` kloter. Di luar itu season berjalan tidak bisa dibeli | Sesi 25 Sep |
| Dua jalur pendaftaran: admin manual dan payment gateway. Gateway (checkout dengan tenggat) ditunda | Sesi 25 Sep |
| Override fase = geser tanggal. Tanpa flag | Sesi 25 Sep |
| Ambang "tenggat mendekat" diatur admin per kloter | Sesi 25 Sep |
| Akses naskah lewat satu fungsi plug-in. Sementara D4 di-hold, semua mentor boleh membaca dan menilai semua naskah | Sesi 25 Sep |
| Gerbang bucket naskah di DB lewat Storage policy, bukan server perantara | Sesi 25 Sep |
| Peserta tidak boleh menimpa atau menghapus naskah yang sudah diunggah; revisi = setor ulang | Sesi 25 Sep |
| **Kaidah jalur tulis:** aturan per baris → admin tulis langsung (RLS + constraint); aturan lintas baris/tabel → RPC | Sesi 25 Sep |
| Peran: `admin` = semua konten, `mentor` = penilai, `staff` = operasional acara | Sesi 25 Sep |
| Tabel bekas `video_progress` bernama `kuis_peserta` | Sesi 25 Sep |
| 18 migrasi lama + paket baru digabung jadi satu baseline | Sesi 25 Sep |
| Deploy ke cloud mempertahankan akun | Sesi 25 Sep |
| Kuis belum bisa dibuka sampai bank soal aktif ≥ `jumlah_soal_tampil` | Sesi 25 Sep |
| Kunci yang salah bisa dikoreksi admin, dan skor jawaban terdampak dihitung ulang | Sesi 25 Sep |
| Rumus nilai kuis season = satu fungsi plug-in. Default: rumus tim (total benar ÷ total soal); rata-rata per kelas tinggal ganti isi fungsi | Sesi 25 Sep |
| Kaidah invarian vs kebijakan (§2.4) | Sesi 25 Sep |
| Keputusan kecil saat menulis baseline: RPC `get_status_kuis` untuk layar; season/kloter draft dan kelas milik season draft hanya terlihat admin; kloter asal wajib satu season dengan yang dibeli (FK komposit); `setor_karya` menolak berkas di folder orang lain; mentor tidak bisa menilai setelah kloter ditutup; mentor boleh membaca `user_seasons` (dibutuhkan `naskah_mengikat`); format jawaban kuis `{ "<id soal>": <indeks pilihan> }`; `btree_gist` tidak dipakai lagi | Implementasi 25 Sep, disetujui Akami |

**Konsekuensi** (bukan keputusan — satu-satunya jawaban yang mungkin, mengikuti yang di atas):

| Konsekuensi | Mengikuti dari |
|---|---|
| Filter naskah mengikat = `kloter_id == kloter_daftar_id` | Penilaian hanya di kloter asal + telat tak dinilai + D6 |
| `target_selesai` dihapus | Ketiga perannya dicabut keputusan lain: GiST berhenti di b5 (D3), auto-wrap ditolak (B.2), janji tanggal ditolak pola Notion |
| `rekomendasi` dihapus dari Zod | Ketiga nilainya mati: `lulus` (semua lulus), `revisi` (mustahil, mentor menilai setelah jendela tutup), `ikut_serta` (bukan keputusan mentor) |
| `certificates.jenis` dihapus | Rubrik nullable → "ada nilai tulisan" jadi turunan |
| Gerbang materi berbasis **ambang**, bukan jendela | "Video = ambang" sudah terkunci → `now() < closes_at` di `get_video_url` adalah cacat, bukan pilihan desain |
| Kombinasi season-`selesai` × kloter-`berjalan` tidak bisa terjadi | A3b menjadikannya prasyarat, bukan keadaan yang dikelola |
| Nol peserta terlantar saat season ditutup lebih awal | Pendaftaran hanya di kloter aktif → tak ada yang terdaftar di kloter `draft`; saat penutupan sah, semua kloter non-draft sudah `wrapped` → sudah lewat b3 → akses video terbuka permanen |
| `video_progress.ditonton` dihapus | Progres tontonan diturunkan dari `jawaban_soal IS NOT NULL` → turunan tersimpan |
| `p_watched_seconds` dan `p_quiz_score` hilang dari RPC classroom | Keduanya angka klien yang tak bisa diverifikasi; skor dihitung server dari `kunci`, tontonan diturunkan |
| §5.3 tertutup | Tidak ada lagi argumen untuk mengirim skor karangan |
| Tabel `video_progress` berganti nama | Setelah `ditonton` hilang, isinya murni undian + jawaban + skor kuis. Nama lama akan mengundang orang menambahkan progres tontonan kembali |
| Backfill B5 dihapus | Tidak ada database yang punya data `kloter_phases` untuk dipindahkan: cloud belum menjalankan migrasinya, seed lokal jalan setelah migrasi (§4.5) |
| `buat_season`, `buat_kloter`, `ubah_jadwal_kloter` tidak jadi RPC | Aturannya per baris → kaidah jalur tulis |
| Kolom status (`kloters.status`, `kloters.tanggal_selesai`, `seasons.terbit`, `seasons.tanggal_selesai`) hanya bisa ditulis lewat RPC | Perpindahan status punya syarat lintas tabel |
| Isi soal tidak bisa diubah; hanya `aktif` | Jawaban tercatat merujuk isi soal. Mengubahnya menempelkan jawaban ke pertanyaan lain |
| `is_mentor_for_kloter()` dihapus | Satu-satunya pemakainya `nilai_karya`, yang pindah ke plug-in naskah |
| Pembeli arsip tidak perlu dikecualikan di gerbang setor | Kloter kosong tidak pernah sama dengan kloter mana pun |

### 3.2 Bentuk target tabel `kloters` dan `seasons`

Lima batas untuk empat fase berjadwal, plus ekor yang digerakkan aksi admin.

```text
b1 ─────── b2 ─────── b3 ─────── b4 ─────── b5 ═══════════════►
  pendaftaran orientasi  menyimak   menulis_setor   (ekor: status)
  └────────── berjadwal, dikunci GiST ──────────┘
```

Catatan baca: `offline` dan `antara_kloter` **tidak** ada di garis ini. Keduanya hidup di celah `[b5_N, b1_{N+1})` antar kloter — kloter tidak menempel terus tanpa jeda (S7).

#### `kloters`

| Kolom | Tipe | Peran |
|---|---|---|
| `season_id`, `nomor`, `kapasitas` | — | tidak berubah |
| `status` | `text NOT NULL DEFAULT 'draft'` | `'draft'` \| `'berjalan'` \| `'wrapped'` |
| `tanggal_mulai` (b1) | `timestamptz NOT NULL` | pendaftaran dibuka |
| `tgl_mulai_orientasi` (b2) | `timestamptz NOT NULL` | pendaftaran tutup, orientasi buka |
| `tgl_mulai_menyimak` (b3) | `timestamptz NOT NULL` | **ambang** akses video, permanen setelahnya |
| `tgl_mulai_setor` (b4) | `timestamptz NOT NULL` | **jendela** setor buka |
| `tgl_tenggat_setor` (b5) | `timestamptz NOT NULL` | jendela setor tutup; masa penilaian mulai |
| `tanggal_selesai` | `timestamptz NULL` | terisi saat admin menutup kloter |
| `target_penilaian` | `timestamptz NULL` | target internal admin. Tidak menegakkan apa pun, tidak pernah ke peserta |
| `livestream_url` | `text NULL` | tautan YouTube penutup fase menyimak, per kloter |
| `livestream_at` | `timestamptz NULL` | jadwal siaran |
| `ambang_pengingat` | `interval NOT NULL DEFAULT '3 days'` | berapa lama sebelum b5 banner "tenggat mendekat" tampil. Diatur admin |

```sql
-- D5: ketat semua kecuali b2 = b3
CONSTRAINT urutan_tanggal_valid CHECK (
  tanggal_mulai       <  tgl_mulai_orientasi AND
  tgl_mulai_orientasi <= tgl_mulai_menyimak  AND   -- orientasi boleh berdurasi nol
  tgl_mulai_menyimak  <  tgl_mulai_setor     AND
  tgl_mulai_setor     <  tgl_tenggat_setor
)

CONSTRAINT status_valid CHECK (status IN ('draft','berjalan','wrapped'))

CONSTRAINT selesai_setelah_tenggat CHECK (
  tanggal_selesai IS NULL OR tanggal_selesai >= tgl_tenggat_setor
)

-- status dan tanggal_selesai tidak boleh berselisih
CONSTRAINT wrapped_menutup CHECK (
  (status = 'wrapped') = (tanggal_selesai IS NOT NULL)
)

-- D3: yang dikunci hanya bagian berjadwal. Ekor masa penilaian bebas menjuntai.
-- Parsial: kloter draft dikecualikan supaya panitia bisa menyiapkan jadwal
-- alternatif yang tumpang tindih. Penegakan pindah ke saat publikasi
-- (UPDATE status draft -> berjalan tetap dievaluasi constraint ini).
CONSTRAINT kloter_tidak_overlap EXCLUDE USING gist (
  tstzrange(tanggal_mulai, tgl_tenggat_setor, '[)') WITH &&
) WHERE (status <> 'draft')

CONSTRAINT ambang_pengingat_positif CHECK (ambang_pengingat > interval '0')
```

Pengecualian `draft` pada constraint itu keputusan kecil yang kuambil sendiri dengan alasan di komentar; kalau ternyata panitia tidak butuh jadwal tentatif, hapus `WHERE`-nya (S2).

#### `seasons` — D1 opsi 3

`status` dipecah karena isinya dua hal berbeda:

| Sebelum | Sesudah | Sifat |
|---|---|---|
| `status = 'draft'` | `terbit boolean NOT NULL DEFAULT false` | editorial — tersimpan, keputusan manusia |
| `status = 'berjalan'` \| `'selesai'` | turunan dari `tanggal_mulai` / `tanggal_selesai` | siklus hidup — tidak disimpan |

Empat keadaan dari satu boolean plus dua tanggal yang sudah ada — lebih presisi daripada tiga nilai enum, karena enum lama tidak bisa menyatakan "sudah terbit tapi belum mulai":

```sql
CASE
  WHEN NOT terbit                     THEN 'draft'
  WHEN now() < tanggal_mulai          THEN 'akan_datang'
  WHEN tanggal_selesai IS NOT NULL
       AND now() >= tanggal_selesai   THEN 'selesai'
  ELSE 'berjalan'
END
```

**A3 tetap terjaga:** menutup season lebih awal = memendekkan `tanggal_selesai` ke `now()`. Kemampuannya utuh, dan jejaknya lebih terbaca daripada mengubah enum karena "kapan ditutup" ikut terekam.

**A3b ditegakkan sebagai prasyarat**, bukan cascade. Penutupan season ditolak kalau ada kloter miliknya berstatus `berjalan`. Tempatnya RPC `ubah_status_season` aksi `tutup` (§3.10), bukan trigger. `tanggal_selesai` tidak bisa ditulis langsung, jadi tidak ada jalan pintas yang melewati syarat ini.

Karena `seasons` tidak lagi punya status siklus hidup, kosakata `'selesai'` vs `'wrapped'` untuk konsep paralel ikut hilang (S1 tertutup).

#### Peruntuhan `kloter_phases` — tanpa backfill

Revisi sebelumnya punya aturan backfill B5: b1–b4 dari `opens_at` tiap fase, b5 dari `closes_at` fase `menulis_setor`, dan migrasi gagal keras kalau ada fase yang hilang. Preflight 25 Sep menunjukkan aturan itu tidak punya data untuk dipindahkan. Cloud belum pernah menjalankan satu pun dari 18 migrasi, dan seed lokal baru jalan setelah migrasi. Karena itu seluruh migrasi digabung jadi **satu baseline** (§7) yang langsung membuat bentuk akhir; `kloter_phases` tidak pernah dibuat.

**Override fase = geser tanggal.** `override_active/_by/_at` tidak diganti flag apa pun. Tombol di UI tetap boleh ada, tapi isinya menulis tanggal:

| Tombol | Yang terjadi |
|---|---|
| Maju ke fase berikutnya sekarang | batas fase berikutnya diisi `now()` |
| Perpanjang tenggat setor | b5 digeser |
| Perpendek orientasi | b3 digeser lebih awal |

Satu sumber kebenaran, tidak ada flag yang lupa dimatikan, dan tanggal di arsip sesuai kejadian. Dua batasan ikut terbawa: maju **satu fase per langkah** (lompat dua fase membuat dua tanggal sama dan ditolak `urutan_tanggal_valid`, kecuali b2 = b3), dan memperpanjang b5 melewati b1 kloter berikutnya yang sudah dipublikasikan ditolak GiST — geser kloter berikutnya dulu. Kloter `wrapped` tidak bisa diubah jadwalnya (RLS, §3.10).

Kolom lama di cloud (`users.usia`, `users.profile_completed`, `event_sessions.tipe`) tidak dibawa. Isinya data tester (§4.5).

#### Dua peristiwa yang mengapit kloter

Notion menjanjikan **12 peristiwa per season** ke pembeli: 6 rekaman sesi offline (pembuka) plus 6 livestream (penutup fase menyimak). Sebelum baseline, **nol yang punya tempat di skema** — grep `rekaman|recording` di seluruh 18 migrasi lama mengembalikan nol hasil, dan satu-satunya kolom yang pernah ditambahkan ke `event_sessions` adalah `kloter_id`.

Penempatannya **asimetris (opsi A)**, karena asimetrinya nyata:

| Peristiwa | Rumah | Alasan |
|---|---|---|
| Rekaman sesi offline | `event_sessions.rekaman_url text NULL` | Rekaman dari acara yang **sudah punya baris** lengkap dengan tanggal, venue, dan kuota. Menaruhnya di tabel lain membuatnya yatim |
| Livestream | `kloters.livestream_url`, `kloters.livestream_at` | **Tidak punya baris acara** — siaran YouTube, bukan acara bervenue. Memaksanya jadi baris `event_sessions` akan menyeret seluruh mesin booking (`kapasitas`, `kuota_terisi`, `qr_token`, check-in) yang tidak dibutuhkan siaran |

Host-nya juga beda: rekaman offline lewat Bunny (butuh embed token), livestream cuma tautan YouTube. Gerbangnya sama — §3.4.

Tabel `kloter_peristiwa` ditolak: jenis peristiwanya ada dua dan tidak ada yang ketiga di horizon. Kalau nanti muncul, promosi dari kolom ke tabel bukan pekerjaan berat.

#### Bank soal dan undian per peserta

Soal melekat di `kelas` (level season), berbeda antar video — bukan per kloter. Tiap kelas punya bank soal yang **lebih besar** dari jumlah yang ditampilkan, dan yang ditampilkan diundi per peserta.

```sql
CREATE TABLE public.soal (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas_id   uuid NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  pertanyaan text NOT NULL,
  pilihan    jsonb NOT NULL,        -- ["...", "...", "...", "..."]
  kunci      smallint NOT NULL,     -- indeks jawaban benar di `pilihan`
  aktif      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kunci_menunjuk_pilihan CHECK (
    CASE WHEN jsonb_typeof(pilihan) = 'array'
         THEN kunci >= 0 AND kunci < jsonb_array_length(pilihan)
         ELSE false
    END
  )
);

-- Seluruh tabel rahasia (kunci), jadi cukup RLS: hanya admin yang melihat baris.
-- Beda dengan kelas.video_url yang barisnya publik tapi satu kolomnya rahasia.
CREATE POLICY soal_admin_select ON public.soal FOR SELECT TO authenticated
  USING ((SELECT app_internal.is_admin()));
CREATE POLICY soal_admin_insert ON public.soal FOR INSERT TO authenticated
  WITH CHECK ((SELECT app_internal.is_admin()));
CREATE POLICY soal_admin_update ON public.soal FOR UPDATE TO authenticated
  USING ((SELECT app_internal.is_admin())) WITH CHECK ((SELECT app_internal.is_admin()));

-- Isi soal beku: yang boleh diubah hanya `aktif`. Tanpa DELETE.
REVOKE ALL ON public.soal FROM anon, authenticated;
GRANT SELECT, INSERT ON public.soal TO authenticated;
GRANT UPDATE (aktif) ON public.soal TO authenticated;

ALTER TABLE public.kelas
  ADD COLUMN jumlah_soal_tampil smallint NOT NULL DEFAULT 5
    CHECK (jumlah_soal_tampil BETWEEN 1 AND 20);
```

Revisi sebelumnya memakai `REVOKE SELECT ON public.soal FROM authenticated`. Itu mengunci admin juga, karena akun admin berperan `authenticated`, sehingga tidak ada jalur untuk mengisi soal sama sekali. RLS admin-only menutup kebocoran yang sama tanpa mengunci penulisnya.

Impor massal tidak butuh RPC: kirim daftar baris dalam satu request PostgREST. Satu `INSERT`, atomik — gagal satu, batal semua.

`jumlah_soal_tampil` per-kelas, bukan konstanta di kode, karena Notion menyebut 3–5 soal per video — angkanya bervariasi.

**Kuis belum tersedia selama bank kurang.** Revisi sebelumnya menyebut bank kecil sebagai "degradasi anggun" (`min(M, N)`). Ditelusuri lewat alurnya, ternyata bukan: undian dikunci saat kuis pertama dibuka, jadi peserta yang membuka ketika bank baru berisi 2 soal **selamanya** mendapat 2 soal, sekalipun admin menambah soal sejam kemudian. `get_soal_kelas` karenanya menolak mengundi selama soal aktif < `jumlah_soal_tampil` (hint `KUIS_BELUM_TERSEDIA`). Peserta melihat "kuis belum tersedia"; admin melihat penghitung `aktif / tampil / target 3×` di halaman kelas.

**Isi soal beku.** Baris jawaban merujuk soal lewat `soal_terpilih`. Kalau `pertanyaan` atau `pilihan` bisa diubah setelah diundi, jawaban yang sudah tercatat menempel ke pertanyaan yang berbeda — keluarga G9 lagi. Tombol "Edit" di UI menonaktifkan soal lama lalu membuat soal baru; soal nonaktif disembunyikan dari daftar dan tidak ikut undian berikutnya, tapi undian yang sudah terkunci tidak berubah. `uuid[]` tidak bisa dijaga foreign key, jadi larangan DELETE juga yang mencegah rujukan yatim.

**Satu pengecualian: kunci yang salah.** Kalau kunci ternyata salah setelah peserta menjawab, menonaktifkan soal tidak menolong yang sudah dinilai salah. Untuk itu ada RPC admin:

```sql
koreksi_kunci(p_soal_id uuid, p_kunci smallint) → integer  -- jumlah jawaban yang dihitung ulang
```

Isinya: kunci soal dibetulkan, lalu `skor` setiap baris `kuis_peserta` yang soalnya ada di `soal_terpilih` dan sudah dijawab dihitung ulang. `skor` berarti **jumlah jawaban benar**, bukan persen; penyebutnya selalu `cardinality(soal_terpilih)`. Perhitungannya satu fungsi internal yang juga dipakai `jawab_kuis`, jadi dua jalur ini tidak bisa berselisih cara menghitung. Hanya `kunci` yang bisa dikoreksi; pertanyaan dan pilihan tetap beku.

Tidak perlu syarat "raport belum terbit". Raport menyimpan salinan nilai kuis sendiri (pola G9), jadi koreksi setelah raport terbit memperbarui `kuis_peserta.skor` tanpa menyentuh angka yang sudah tercetak. Itu memang arti membekukan.

**Undian disimpan, tidak diturunkan ulang.** Undian deterministik (`ORDER BY md5(user_id || kelas_id || soal_id)`) terlihat lebih bersih dan tanpa penyimpanan, tapi punya bahaya senyap: begitu admin menambah satu soal ke bank, urutan md5 bergeser dan himpunan milik peserta berubah. Peserta bisa dinilai terhadap soal yang tidak pernah dia lihat.

Dengan **kuis satu kesempatan**, itu bukan gangguan — itu kerusakan tanpa pemulihan, dan nilainya ikut tercetak di raport. Ini keluarga yang sama dengan G9: sesuatu yang menentukan isi dokumen tidak boleh bisa berubah retroaktif.

```sql
-- pada tabel jawaban kuis (bekas `video_progress`)
soal_terpilih uuid[] NOT NULL DEFAULT '{}'   -- dikunci saat kuis pertama dibuka
```

Menyimpan hasil undian tidak melanggar uji turunan: hasil undian baru jadi "turunan" kalau bank-nya dijamin tidak berubah, dan justru jaminan itu yang tidak ada.

Konsekuensi lifecycle: baris jawaban lahir saat peserta **membuka** kuis, bukan saat mengirim. Diverifikasi 25 Sep: `UNIQUE (user_id, kelas_id)` sudah ada, dan `jawaban_soal` nullable.

#### Kuis satu kesempatan, dan hilangnya dua angka klien

Sekali kirim, jawaban final. Penandanya `jawaban_soal IS NULL` = belum dijawab; tidak perlu kolom tambahan:

```sql
-- di dalam jawab_kuis, setelah FOR UPDATE pada baris jawaban
IF v_row.jawaban_soal IS NOT NULL THEN
  RAISE EXCEPTION 'Kuis kelas ini sudah dijawab dan tidak bisa diubah'
    USING errcode = '55000', hint = 'KUIS_SUDAH_DIJAWAB';
END IF;
```

`FOR UPDATE` mencegah dua kiriman bersamaan lolos berdua — pola yang sama dengan anti-double-scan di `check_in_booking`.

Aturan satu-kesempatan membuat `submit_classroom_progress` memikul dua kontrak yang berlawanan: progres tontonan idempoten dan boleh berulang, jawaban kuis sekali-tulis dan harus menolak yang kedua. Karena **progres tontonan diturunkan dari status jawaban**, konflik itu diselesaikan dengan menghapus separuhnya:

| Sekarang | Jadi |
|---|---|
| `submit_classroom_progress(kelas_id, watched, jawaban, score)` | `jawab_kuis(kelas_id, jawaban)` |
| Skor dari klien, ditulis apa adanya | Server mencocokkan `jawaban` ke `kunci` dari `soal_terpilih` |
| `p_watched_seconds` dari klien | dihapus — `ditonton` diturunkan dari `jawaban_soal IS NOT NULL` |
| — | `get_soal_kelas(p_kelas_id)` menyajikan soal **tanpa `kunci`**, mengunci undian saat pertama dipanggil |

Dasarnya batasan Bunny yang sudah diterima: *"video tampil lewat embed view Bunny (iframe), bukan pemutar custom — kontrol pemutar (posisi tonton, timestamp) tidak bisa diakses. Konsekuensi: status 'selesai' kemungkinan besar diambil dari jawaban soal, bukan dari progres video."* Angka `p_watched_seconds` dari klien tidak bisa diverifikasi — kelas yang sama dengan `p_quiz_score`.

Progres "sesi 2 dari 6" di Beranda karenanya dihitung dari jumlah kelas yang **kuisnya sudah dijawab**, bukan dari detik tontonan. Peserta yang membuka kuis tapi tidak mengirim terhitung belum selesai, dan itu benar.

Yang boleh menjawab hanya peserta `jenis = 'bimbingan'`, selama jendela kuis kloter asalnya.

#### Plug-in jendela kuis

Satu fungsi menjawab satu pertanyaan: jendela kuis kloter ini sedang apa. Inputnya kloter asal, bukan orangnya — jendelanya sama untuk semua anggota satu kloter. Hal lain (peserta bimbingan atau bukan, sudah menjawab atau belum) sengaja tidak ikut; itu fakta tentang orang, bukan kebijakan.

```sql
app_internal.status_jendela_kuis(p_kloter_id uuid)
  → 'belum_buka' | 'terbuka' | 'tutup'

-- isi sekarang: hanya selama fase menyimak
CASE
  WHEN k.status <> 'berjalan'          THEN 'tutup'
  WHEN now() < k.tgl_mulai_menyimak    THEN 'belum_buka'
  WHEN now() < k.tgl_mulai_setor       THEN 'terbuka'
  ELSE                                      'tutup'
END
```

| Pemanggil | Urutan pemeriksaan |
|---|---|
| `get_soal_kelas` | login → peserta `bimbingan` season itu → **jendela `terbuka`** → bank cukup (kalau belum diundi) → undi dan kunci |
| `jawab_kuis` | login → peserta `bimbingan` → **jendela `terbuka`** → baris dikunci, belum dijawab → hitung skor |
| RPC status untuk layar | status 6 kelas sekaligus: `belum_buka` / `terbuka` / `tutup` / `sudah_dijawab` / `belum_tersedia` |

Sifat yang ikut: jendela bergeser sendiri saat admin menggeser b3/b4, karena yang dibaca tanggal. Tombol "maju ke fase setor sekarang" menutup kuis saat itu juga. Kloter kosong atau draft → `tutup` (fail-closed). Kuis selalu tutup sebelum b5, jadi tidak ada balapan dengan penutupan kloter.

Pilihan lain yang tercatat: `[b3, b5)` (tutup di tenggat setor) atau terbuka sampai kloter ditutup (butuh `FOR SHARE` pada baris kloter untuk mencegah jawaban masuk setelah raport disalin). Pindah = ganti isi fungsi.

### 3.3 Dua turunan yang berbeda, dan mode layar

**B1:** `kloter_aktif` seperti sekarang tidak cukup, karena dua kloter bisa berstatus `berjalan` bersamaan setelah D3:

```text
kloter N     |-- b1 -- b2 -- b3 -- b4 ------- b5 ==============| wrap
                                                 masa penilaian
kloter N+1                                    |-- b1 -- b2 -- b3 -->
                                              ^ dua-duanya 'berjalan'
```

View lama memilih yang paling baru mulai dan **menjatuhkan kloter N secara sistematis**, sehingga anggota kloter N di masa penilaian diresolusi memakai tanggal kloter N+1 dan mendapat layar fase alih-alih "sedang dinilai". Gantinya dua turunan terpisah:

| Turunan | Definisi | Dipakai untuk |
|---|---|---|
| **`kloter_dalam_fase`** | `now() ∈ [tanggal_mulai, tgl_tenggat_setor)` **dan** `status = 'berjalan'` **dan** season induk sedang `berjalan` | Gerbang setor; penentuan fase berjadwal untuk layar |
| **Kloter asal user** | `user_seasons.kloter_daftar_id` (kosong untuk pembeli arsip), lalu status dan tanggal kloter itu | Gerbang video (ambang) dan kuis (jendela); layar "sedang dinilai" (`status = 'berjalan' AND now() >= tgl_tenggat_setor`); raport |

`kloter_dalam_fase` **unik by construction** berkat GiST parsial `[b1, b5)`, jadi `LIMIT 1` tidak lagi menyembunyikan apa pun. Celah `[b5_N, b1_{N+1})` memang tidak punya kloter dalam fase, dan itu benar — jendela setor sedang tutup.

**Fase kloter — 4 nilai.** Hanya segmen berjadwal, punya awal dan akhir:

`pendaftaran` → `orientasi` → `menyimak` → `menulis_setor`

Uji yang memisahkannya dari yang lain: **apa yang mengakhiri nilai ini?** Empat di atas diakhiri tanggal. `wrapped` tidak diakhiri apa pun (dia tujuan). `antara_kloter` diakhiri kloter berikutnya (keadaan platform). `offline` diakhiri pembukaan pendaftaran (acara di `event_sessions`).

**Status kloter — 3 nilai:**

| `status` | Arti | Layar peserta |
|---|---|---|
| `draft` | belum dipublikasikan | — |
| `berjalan` | sebelum b5 → fase berjalan; sesudah b5 → masa penilaian | 4 layar fase, lalu "sedang dinilai" |
| `wrapped` | admin sudah menutup, nilai keluar | raport + sertifikat |

Masa penilaian **tidak disimpan** — turunan dari `now() >= tgl_tenggat_setor AND status = 'berjalan'` pada **kloter asal user**, bukan kloter dalam fase.

#### Mode layar — enumerasi lengkap (H10)

Bukan enum database. Hasil resolusi prioritas atas empat sumber, dievaluasi berurutan; yang pertama cocok menang. Nomor prioritas mengikuti daftar At-a-Glance di Notion `/app · Beranda Utama`.

| # | Mode layar | Kondisi | Sumber | Prioritas Notion |
|---|---|---|---|---|
| 1 | `tenggat_setor_dekat` | user anggota `kloter_dalam_fase`, fase `menulis_setor`, `tgl_tenggat_setor - now()` di bawah ambang | tanggal kloter dalam fase | 1 |
| 2 | `menyimak_berjalan` | user anggota `kloter_dalam_fase`, fase `menyimak` | tanggal kloter dalam fase | 2 |
| 3 | `tiket_belum_scan` | ada `bookings` `status='booked'` untuk `event_sessions` hari ini/besok | `bookings` + `event_sessions` | 3 |
| 4 | `raport_keluar` | ada baris `certificates` untuk `user_season` | `certificates` | 4 |
| 5 | `pendaftaran_buka` | `kloter_dalam_fase` fase `pendaftaran` **dan** user belum punya season itu | tanggal + kepemilikan | 5 |
| 6 | `orientasi` | user anggota `kloter_dalam_fase`, fase `orientasi` | tanggal kloter dalam fase | 6 |
| 7 | `sedang_dinilai` | kloter asal user `status='berjalan'` **dan** `now() >= tgl_tenggat_setor` | kloter asal user | — (H5 Notion) |
| 8 | `antara_kloter` | punya season, dan kloter asal `wrapped` **atau** `jenis = 'arsip'`; tidak sinkron dengan `kloter_dalam_fase` | kepemilikan + perbandingan id | 7 |
| 9 | `offline` | ada `event_sessions` kloter berikutnya, kloternya belum mulai | `event_sessions` | 7 (berbagi) |
| 10 | `belum_punya_season` | tidak ada `user_seasons` | kepemilikan | 7 (kondisi A) |

Tiga catatan yang membuat daftar ini tidak sekadar turunan fase:

- **Nomor 1 butuh tanggal mentah**, bukan enum — "mendekat" itu jarak, dan enum tidak bisa menyatakan jarak.
- **Nomor 3 dan 4 tidak melewati fase sama sekali.** Kartu QR digerakkan `bookings`; raport digerakkan keberadaan baris `certificates`.
- **Nomor 7 lahir dari kloter asal user**, sementara 1/2/5/6 lahir dari kloter dalam fase. Inilah yang mustahil dilayani satu view tunggal, dan alasan B1 memisahkan dua turunan.

Ambang "mendekat" pada nomor 1 = `kloters.ambang_pengingat`, default 3 hari, diatur admin per kloter.

### 3.4 Gerbang

| Pertanyaan | Bentuk | Sumber | Status kode |
|---|---|---|---|
| Boleh nonton video? | **ambang**, permanen | `bimbingan`: `tgl_mulai_menyimak` kloter asal. `arsip`: langsung terbuka. Admin: selalu | ✅ `get_video_url` |
| Boleh setor sekarang? | **jendela**, buka-tutup | jendela `kloter_dalam_fase`; berkas wajib di folder penyetor | ✅ `setor_karya` |
| Boleh jawab kuis? | **jendela kloter asal**; sekali saja | `status_jendela_kuis` = `terbuka` (fase menyimak `[b3, b4)`); `jawaban_soal IS NULL`; hanya `bimbingan` | ✅ `gerbang_kuis` + `jawab_kuis` |
| Naskah ini dinilai? | perbandingan, versi terakhir | view `naskah_mengikat` | ✅ |
| Boleh baca / nilai naskah? | plug-in | pemilik (baca saja); penilai = `boleh_menilai_naskah()` — sekarang admin + semua mentor | ✅ policy tabel + Storage, `nilai_karya` |
| Boleh lihat tautan livestream & rekaman offline? | **kepemilikan season**, tanpa komponen waktu | `user_seasons` untuk season kloter yang punya peristiwa itu | ✅ `get_season_peristiwa`; URL dicabut dari SELECT |
| Boleh lihat `soal.kunci`? | hanya admin | RLS | ✅ |

Gerbang tidak boleh mengonsultasi nilai `fase`. Keduanya turun dari kolom yang sama, tapi jalurnya berbeda — supaya nilai presentasi yang bergeser tidak pernah membuka atau menutup gerbang.

#### Definisi "kepemilikan season" (B3)

Frasa ini punya dua bacaan yang memberi hasil berlawanan, dan §1.4 menunjukkan **keduanya sudah hidup di repo**. Yang berlaku ditetapkan **per bentuk gerbang**, bukan satu untuk semua:

| Gerbang | Bacaan yang benar | Alasan |
|---|---|---|
| Setor karya (jendela) | user punya `user_seasons` untuk season **`kloter_dalam_fase`** | Setor selalu masuk ke jendela yang sedang terbuka; kalau usernya tidak memiliki season itu, tidak ada tempat untuk naskahnya |
| Video (ambang) | user punya `user_seasons` untuk season **`kelas` yang diminta** | Ambang permanen dan berlaku untuk season arsip, yang tidak punya kloter dalam fase sama sekali |
| Kuis (jendela) | user punya `user_seasons` **`bimbingan`** untuk season `kelas` yang diminta; jendelanya milik kloter asal | Nilai kuis naik ke raport kloter asal; di luar jendela itu tidak ada raport yang bisa menampungnya |
| Peristiwa kloter (livestream & rekaman offline) | user punya `user_seasons` untuk season **kloter pemilik peristiwa** | Notion 26 Agt: *"Melekat di kloter ≠ hak akses per kloter... siapa yang boleh menonton ditentukan kepemilikan season."* Dikonfirmasi Mas Titian dua kali: akses berlaku dua arah dalam satu season, dan pembeli season arsip juga dapat |

Jadi `setor_karya` sudah memakai bacaan yang benar, begitu juga `get_video_url`. Yang salah bukan bacaan kepemilikannya, melainkan **gerbang fasenya** yang menumpang ke kloter aktif — §5.1.

Akibat yang diterima: anggota kloter lama dari season yang **berbeda** dengan season kloter dalam fase tidak bisa menyetor apa pun, karena tidak ada jendela yang berlaku untuknya. Itu bukan cacat, itu turunan dari "setor mengikuti jendela kloter". Tapi janji §3.5 soal naskah latihan karenanya hanya berlaku **dalam satu season**.

#### Kenapa gerbang peristiwa tanpa komponen waktu

Tautannya punya **dua kehidupan**, dan Notion sendiri menyebutnya: *"kalau disiarkan lewat YouTube dan videonya disimpan, sifatnya berubah jadi rekaman biasa."* URL yang sama adalah siaran langsung sebelum `livestream_at`, lalu rekaman permanen sesudahnya. Gerbang waktu apa pun akan salah di salah satu sisi; kepemilikan season adalah satu-satunya hal yang konstan di keduanya.

Tiga alasan pendukung, semuanya sudah terkunci di Notion:

- Pola rekaman: *"user tidak perlu tahu status unggah rekaman. Rekaman muncul begitu ada, tanpa baris kosong berlabel"* (Adam, 26 Agt).
- Tampil awal itu **fitur**: ini acara komunal, dan tautan yang muncul lebih dulu menaikkan kehadiran — YouTube sendiri sudah menangani halaman "menunggu siaran dimulai".
- Gerbang waktu tidak menyelesaikan risiko sebenarnya, yaitu peserta membagikan tautannya ke luar. Itu kelas masalah yang sama dengan C7 (screen recording), dan kesimpulan Notion di sana **mempersulit, bukan mencegah**.

Yang tetap wajib dan bukan pilihan: URL dicabut dari SELECT publik, disajikan lewat RPC. Tautan YouTube unlisted berada di kelas risiko yang sama dengan `kelas.video_url` — siapa pun yang memegangnya bisa menonton. Kalau `livestream_url` bisa di-`SELECT` lewat PostgREST, tautannya bocor lewat pintu yang baru ditutup untuk video.

Karena peserta berhak atas keenam peristiwa satu season, bentuk alaminya daftar:

```sql
get_season_peristiwa(p_season_id uuid)
  → (kloter_nomor, jenis, jadwal, media_url)[]
```

Gerbangnya satu baris: `EXISTS (SELECT 1 FROM user_seasons WHERE user_id = auth.uid() AND season_id = p_season_id)`, atau admin. Tanpa join ke kloter dalam fase, tanpa cek fase — itu justru yang membuat §5.1 rusak, dan pemilik season arsip harus tetap bisa mengaksesnya.

`livestream_at` boleh tetap ikut SELECT publik kalau jadwalnya memang mau dipromosikan; yang perlu dijaga hanya URL-nya.

### 3.5 Naskah mengikat vs latihan

| Kelas | Syarat | Nasib |
|---|---|---|
| **Mengikat** | `writing_submissions.kloter_id == user_seasons.kloter_daftar_id`, **versi terakhir** per peserta | Masuk antrean mentor → nilainya naik ke raport |
| **Latihan** | selain itu | Tersimpan, tidak dibaca mentor, tidak masuk raport |

Versi sebelumnya di kloter asal (v1, v2 saat v3 ada) bukan mengikat dan bukan latihan: riwayat. Mereka tidak masuk antrean. Tanpa "versi terakhir" di definisi view, syarat "semua naskah mengikat sudah dinilai" akan menuntut mentor menilai v1 dan v2 juga, dan kloter tidak bisa diselesaikan.

**D6:** `kloter_id` tetap mencatat **kloter yang jendelanya terbuka saat setor** (perilaku `setor_karya` sekarang). `REVIEW_BACKEND_TEMUAN.md` B3 menuntut sebaliknya — atribusi ke kloter asal penulis. Itu ditolak, dengan dua alasan:

1. **Kolom itu merekam fakta yang tidak bisa direkonstruksi.** "Lewat jendela mana naskah ini masuk" hilang begitu diganti kloter asal, dan menggantinya dengan `created_at ∈ [asal.b4, asal.b5)` membuat klasifikasi bergantung tanggal yang **masih bisa digeser admin** setelah naskah masuk. Perbandingan dua id tidak bisa berubah retroaktif.
2. **Kloter asal bisa diturunkan**, kloter jendela tidak. Menyimpan kloter asal di baris naskah adalah turunan tersimpan — jenis barang yang uji lakmus §2.3 menolak.

Konsekuensinya, pencegahan macetnya tombol "Selesaikan Kloter" (§5.2) memang bertumpu pada view, bukan pada atribusi. Itu diterima secara sadar: view-nya wajib ada, dan satu tempat penegakan lebih mudah dijaga daripada satu invarian yang tersebar di setiap query.

Naskah latihan **hanya** bisa berasal dari anggota kloter sebelumnya **dalam season yang sama**: pendaftaran cuma terbuka di kloter aktif, kloter berjalan serial, jadi `kloter_daftar_id` selalu ≤ kloter dalam fase. Kloter 1 karenanya tidak punya naskah latihan sama sekali — pola "lolos di kloter 1, meledak di kloter 2".

Karena setor hanya boleh saat jendela terbuka, versi mengikat beku sendiri saat jendela tutup. Mentor tidak pernah menghadapi sasaran bergerak, dan tidak ada versi baru yang bisa masuk setelah penilaian mulai.

**Satu view `naskah_mengikat` wajib**, bukan filter yang diulang per query. Alasannya di §5.2.

**`nilai_karya` punya dua syarat tambahan.** Naskahnya harus ada di `naskah_mengikat` — tanpa ini mentor bisa menilai naskah yang nilainya tidak akan sampai ke raport, risiko yang naik sejak semua mentor bisa membuka semua naskah (§3.9). Dan `now() >= tgl_tenggat_setor` kloter itu — sebelum b5 peserta masih bisa menyetor versi baru, dan nilai yang diberikan di tengah jendela menempel ke versi yang bukan final.

Satu orang bisa punya keduanya: naskah mengikat di kloternya sendiri (v1, v2, v3), lalu naskah latihan di jendela kloter berikutnya yang penomorannya mulai dari v1 lagi — `versi` di-scope per `(user_id, kloter_id)`. Label UI harus tidak membuat user mengira riwayatnya hilang.

### 3.6 Raport dan sertifikat — paket, sebagian tertahan

Sudah pasti dibekukan saat terbit (pola G9, sama seperti `nama_penerima`):

- nilai kuis — satu angka 0–100 per season, dihitung fungsi plug-in (di bawah)
- rubrik konten (A/B/C), nullable — kosong kalau tak menyetor naskah mengikat
- rubrik bahasa (A/B/C), nullable
- catatan evaluasi mentor, nullable

**Rumus nilai kuis = plug-in.** Dua lapis, sengaja dipisah:

| Lapis | Fungsi | Sifat |
|---|---|---|
| Per kelas: berapa yang benar | `app_internal.hitung_skor_kuis(soal_terpilih, jawaban)` → jumlah benar | stabil; dipakai `jawab_kuis` dan `koreksi_kunci` |
| Per season: angka di raport | `app_internal.hitung_nilai_kuis(p_user_season_id)` → 0–100 | **plug-in**; dipanggil saat raport dibekukan |

Isi awal `hitung_nilai_kuis` mengikuti kalimat tim (*"akumulasi seluruh soal satu season"*): total benar ÷ total soal × 100. "Total soal" per kelas = `cardinality(soal_terpilih)` kalau kuisnya sudah dibuka, atau `jumlah_soal_tampil` saat ini kalau belum (nilai 0). Dengan begitu admin yang mengubah `jumlah_soal_tampil` setelah sebagian peserta diundi tidak merusak penyebut siapa pun, tanpa aturan kunci tambahan.

Alternatifnya rata-rata per kelas (tiap kelas 0–100, yang tidak dikerjakan 0). Hasilnya sama persis kalau semua kelas jumlah soalnya sama; beda hanya kalau tidak, karena rumus tim memberi bobot lebih ke kelas yang soalnya lebih banyak. Pindah rumus = ganti isi satu fungsi. Raport yang sudah terbit tidak ikut berubah, karena nilainya sudah disalin (G9).

Pembagian bentuk: `writing_submissions.nilai` tetap **jsonb** (ruang kerja mentor, internal, bentuk masih bisa berubah); `certificates` pakai **kolom eksplisit** (beku, dicetak, dikueri). Alasannya bukan nullability, tapi typo: akses kolom terkena type-check dari `database.types.ts`, key jsonb bertipe `any` — salah nama key menghasilkan bagian kosong di sertifikat tanpa satu pun error.

**H3 — paket ini diblokir dua hal, bukan satu.** Raport membekukan nilai kuis, dan §5.3 menutup jalan angka dari klien. Jadi kerja kuis server-side adalah **prasyarat**, bukan item yang bisa diparkir terpisah:

> **paket sertifikat = §4.1 (desain raport) + kuis server-side (§3.2, masuk baseline)**

Menambah kolom beku nanti cuma `ALTER TABLE ADD COLUMN` pada tabel yang barisnya belum ada, jadi paket ini tidak ikut baseline. `certificates` sengaja dibiarkan seperti §1.2; seluruh perubahannya (termasuk penghapusan `jenis`) jalan sebagai satu paket saat §4.1 terjawab. Kuis server-side, prasyarat keduanya, sudah ada.

### 3.7 Pembeli arsip dan jenis kepemilikan

Pembeli arsip mendapat **video dan rekaman** saja. Tanpa bimbingan: tidak ada kuis, setor, penilaian, atau raport — sesuai Notion.

Arsip adalah produk yang berbeda (harga lain), dan jenisnya ditentukan satu aturan: **season sedang berjalan atau sudah selesai pada saat membeli**. Walau bisa dihitung dari `tanggal_diperoleh` dan tanggal selesai season, nilainya tetap disimpan. Hitungan itu gagal uji geser: kalau admin menggeser tanggal selesai season, pembeli bimbingan bisa tiba-tiba terbaca sebagai pembeli arsip, beserta hilangnya raport. Ini fakta pada satu momen, keluarga yang sama dengan `nama_penerima`.

```sql
-- di dalam CREATE TABLE public.user_seasons
kloter_daftar_id uuid NULL REFERENCES public.kloters(id),
jenis            text NOT NULL CHECK (jenis IN ('bimbingan', 'arsip')),
CONSTRAINT arsip_tanpa_kloter CHECK ((jenis = 'arsip') = (kloter_daftar_id IS NULL))
```

Arah logikanya penting. Revisi sebelumnya menebak jenis dari ketiadaan kloter: kosong berarti arsip. Niatnya — yang dibeli adalah akses arsip — tidak pernah tercatat, dan kosong gampang dibaca "lupa diisi". Sekarang `jenis` adalah sumbernya dan kloter kosong akibatnya; CHECK membuat keduanya mustahil berselisih, pola yang sama dengan `wrapped_menutup`.

| Gerbang | Pembeli arsip |
|---|---|
| Video | langsung terbuka — tidak ada kloter asal untuk dibaca tanggalnya |
| Rekaman & livestream | terbuka lewat kepemilikan season, tanpa perlakuan khusus |
| Kuis | ditolak |
| Setor | tertolak sendiri: kloter kosong tidak pernah sama dengan kloter dalam fase |
| Raport | tidak terbit |

`sumber` (`beli`/`gratis`) tetap terpisah: "dapat dari mana" dan "dapat apa" dua pertanyaan berbeda.

### 3.8 Pendaftaran peserta (H8)

Satu RPC, dua pemanggil:

```sql
daftarkan_peserta(p_user_id uuid, p_season_id uuid, p_sumber text) → user_seasons
```

| Pemanggil | Kapan |
|---|---|
| Admin, dari dashboard | pendaftaran manual, `sumber` dipilih admin |
| Server Next.js dengan service role | webhook payment gateway, setelah tanda tangan gateway diverifikasi — **ditunda** |

Peserta sendiri tidak bisa memanggilnya; kalau bisa, siapa pun mendaftar tanpa bayar. Gerbangnya `is_admin()` atau service role. `[INFERENCE]` cara mengenali service role dari dalam fungsi `SECURITY DEFINER` (misalnya `auth.jwt() ->> 'role'`) harus dibuktikan test sebelum dipercaya.

Aturan yang dipegang:

1. **`jenis` ditentukan fungsi, bukan diisi pemanggil.** Season sudah selesai → `arsip`, kloter kosong. Season berjalan → `bimbingan`, dan wajib ada `kloter_dalam_fase` di fase `pendaftaran`; kloter itu jadi kloter asal.
2. **Kapasitas ditegakkan** untuk pertama kalinya: kunci baris kloter `FOR UPDATE`, lalu hitung `user_seasons` kloter itu terhadap `kapasitas`.
3. **Satu kali per season** — sudah dijaga `UNIQUE (user_id, season_id)`.

Akibat yang disengaja: selama season berjalan tapi tidak ada kloter di fase pendaftaran, season tidak bisa dibeli sama sekali.

**Payment gateway, untuk bagian tersendiri nanti.** Model checkout dengan tenggat seperti tiket online:

- Checkout membuat pesanan yang **menahan satu kursi** sampai `expires_at`.
- Kuota = peserta terdaftar + pesanan yang belum kedaluwarsa. Kedaluwarsa diturunkan dari `expires_at`, tidak disimpan, jadi tidak butuh cron pelepas kursi.
- Tenggat link pembayaran di gateway disamakan dengan `expires_at`, sehingga pembayaran telat ditolak gateway sendiri.
- `jenis`, harga, dan kloter asal dicatat **saat checkout**: harga harus tampil sebelum membayar, dan pembayar di menit terakhir pendaftaran tetap masuk kloter yang benar.
- Webhook bisa datang berulang. Penolakan `UNIQUE` di pendaftaran kedua diperlakukan sebagai sukses.

Efeknya ke `daftarkan_peserta` cuma satu: hitungan kapasitas ikut pesanan yang sedang ditahan. Diubah di satu tempat.

### 3.9 Akses naskah: plug-in dan bucket

**Satu fungsi menjawab "siapa penilai naskah ini":**

```sql
app_internal.boleh_menilai_naskah(p_path text) → boolean
-- sekarang: admin, atau role mentor. Semua mentor, semua naskah.
```

Kuncinya path file, karena ketiga pemanggilnya memegang path: nama objek di Storage, `writing_submissions.file_url`, dan baris yang dinilai `nilai_karya`.

| Pemanggil | Aturan |
|---|---|
| Policy SELECT `storage.objects` (bucket `karya-tulis`) | pemilik folder **atau** `boleh_menilai_naskah(name)` |
| Policy SELECT `writing_submissions` | pemilik **atau** `boleh_menilai_naskah(file_url)` |
| `nilai_karya` | `boleh_menilai_naskah(file_url)` |

Ini plug-in-nya. Saat D4 turun, yang diganti hanya isi fungsi ini plus tabel penugasan; ketiga pemanggil tidak disentuh. Sengaja tanpa flag on/off — flag berarti dua jalur logika yang harus dirawat, padahal jalur kedua belum ada isinya. `kloter_mentors` tetap disimpan sebagai informasi, tapi tidak ikut menentukan akses.

Akibat yang diterima: tanpa pembagian, dua mentor bisa menilai naskah yang sama dan yang tersimpan yang terakhir. `FOR UPDATE` menjaga datanya tidak rusak; kerja dobel diatur koordinasi atau penanda di UI.

**Bucket `karya-tulis`:**

| Aturan | Cara |
|---|---|
| Private, hanya PDF/DOC/DOCX, maksimal 10 MB | `allowed_mime_types` dan `file_size_limit` bawaan bucket. Angka 10 MB default, ubah kalau perlu |
| Peserta upload ke foldernya sendiri | policy INSERT: folder pertama = `auth.uid()` |
| Tidak bisa menimpa atau menghapus | tidak ada policy UPDATE/DELETE. Naskah yang sudah dinilai tidak bisa diganti isinya diam-diam; revisi = setor ulang, `versi` naik |
| Baca | tabel di atas |

Signed URL dibuat **Storage API** atas permintaan klien dengan sesinya sendiri, dan Storage menolak kalau policy SELECT menolak. Koreksi atas usulan sebelumnya: RPC SQL tidak bisa membuat signed URL. Jalur server perantara (Next.js + service role) ditolak karena logika akses jadi hidup di dua tempat.

`ponytail:` file yang terunggah tapi `setor_karya`-nya ditolak (misalnya jendela baru tutup) tertinggal yatim di bucket. Dibiarkan; tambah pembersihan berkala kalau volumenya terasa.

### 3.10 Jalur tulis admin

> **Aturan yang cukup dijaga per baris → admin menulis langsung ke tabel, dijaga RLS + constraint.**
> **Aturan yang melibatkan baris atau tabel lain → RPC.**

Ini bukan pola baru: `event_sessions` sudah memakainya sejak baseline Fase 1 (policy `event_sessions_admin_insert/update/delete`). Keamanannya setara RPC karena dua-duanya dijaga di database. UI tidak pernah jadi pagar: API REST Supabase bisa dipanggil langsung dengan token admin. Risiko terbesarnya akun admin yang bocor, dan itu sama di kedua jalur.

**Peran:**

| Peran | Pekerjaan |
|---|---|
| `admin` | semua konten dan pengaturan: season, kloter, kelas, soal, peristiwa, pendaftaran |
| `mentor` | penilai: membaca dan menilai naskah. Tidak menyentuh materi, tidak melihat kunci soal |
| `staff` | operasional acara: scan QR tiket |

Kalau nanti ada tim penyusun soal, perannya ditambah, bukan melebarkan mentor — penilai yang melihat kunci membuka jalur bocor ke peserta.

**Peta operasi:**

| Yang dikelola | Jalur | Yang menjaga |
|---|---|---|
| Season: nama, nomor kaidah, tanggal mulai | tulis langsung | constraint |
| Kloter: b1–b5, kapasitas, `ambang_pengingat`, `target_penilaian` | tulis langsung | CHECK urutan tanggal, GiST, RLS mengunci kloter `wrapped` |
| Kelas + video | tulis langsung | constraint |
| Soal, satu atau banyak | tulis langsung | §3.2 |
| Livestream (`kloters`), rekaman (`event_sessions`) | tulis langsung | RLS admin |
| Status season: terbitkan, batal terbit, tutup | RPC `ubah_status_season` | tutup ditolak kalau ada kloter berjalan (A3b) |
| Status kloter: publikasikan, batal publikasi, selesaikan | RPC `ubah_status_kloter` | publikasi dicek GiST; selesai butuh `now() >= b5` dan semua naskah mengikat sudah dinilai |
| Daftarkan peserta | RPC `daftarkan_peserta` | §3.8 |
| Nilai naskah | RPC `nilai_karya` | §3.9 |
| Koreksi kunci soal | RPC `koreksi_kunci` | hitung ulang skor lintas `kuis_peserta` (§3.2) |

**Kolom status tidak bisa ditulis langsung.** Hak `UPDATE` per kolom bawaan Postgres:

| Tabel | Boleh diubah langsung | Hanya lewat RPC |
|---|---|---|
| `seasons` | `nama`, `nomor_kaidah`, `tanggal_mulai` | `terbit`, `tanggal_selesai` |
| `kloters` | b1–b5, `kapasitas`, `ambang_pengingat`, `target_penilaian`, `livestream_url`, `livestream_at` | `status`, `tanggal_selesai` |

Dua keputusan kecil yang kuambil sendiri:

- **Batal terbit / batal publikasi hanya selama belum ada peserta.** Setelah ada peserta, status hanya bisa maju; menarik season yang sudah diikuti memutus akses orang.
- **Hapus season/kloter hanya selama masih draft** (RLS DELETE).

**Tiga kolom rahasia di baris yang publik:** `kelas.video_url`, `kloters.livestream_url`, dan `event_sessions.rekaman_url`. Hak SELECT per kolomnya dicabut dari `anon` dan `authenticated`, pola yang sama dengan `video_url` sekarang. Admin tetap menulisnya langsung, dan membacanya lewat RPC yang gerbangnya meloloskan admin (`get_video_url`, `get_season_peristiwa`).

### 3.11 Skema sekarang (baseline 25 Sep)

Cermin §1.2–§1.4 supaya bisa dibaca berdampingan. Diverifikasi lewat katalog PostgreSQL lokal; sumbernya `supabase/migrations/20260925000000_baseline.sql`. Kolom **tebal** = baru, ~~coret~~ = dihapus.

Jumlah tabelnya kebetulan sama: **13 tabel** (`kloter_phases` keluar, `soal` masuk). View naik dari 1 ke 2. Status siklus season disajikan sebagai computed field PostgREST `status_siklus` (`seasons?select=*,status_siklus`).

#### Domain Season & Kloter

| Tabel | Sesudah | Δ |
|---|---|---|
| `seasons` | `nomor_kaidah`, `nama`, `tanggal_mulai`, `tanggal_selesai NULL`, **`terbit boolean NOT NULL DEFAULT false`** | ~~`status`~~ pecah: editorial disimpan, siklus hidup jadi turunan (D1) |
| `kloters` | `season_id`, `nomor`, `kapasitas`, **`status`**, `tanggal_mulai` (b1), **`tgl_mulai_orientasi`** (b2), **`tgl_mulai_menyimak`** (b3), **`tgl_mulai_setor`** (b4), **`tgl_tenggat_setor`** (b5), `tanggal_selesai NULL`, **`target_penilaian NULL`**, **`ambang_pengingat`**, **`livestream_url NULL`**, **`livestream_at NULL`** | +9 kolom. Menyerap seluruh isi `kloter_phases` sebagai batas, bukan rentang |
| ~~`kloter_phases`~~ | **tidak pernah dibuat** di baseline | 5 batas di `kloters`; override = geser tanggal (§3.2) |
| `kelas` | `season_id`, `nomor`, `judul`, `video_url`, **`jumlah_soal_tampil smallint NOT NULL DEFAULT 5`** | +1. `video_url` tetap dicabut dari SELECT publik |
| **`soal`** | **baru:** `kelas_id`, `pertanyaan`, `pilihan jsonb`, `kunci smallint`, `aktif`, `created_at` | Bank soal per video. Hanya admin yang melihat; isi beku, hanya `aktif` yang bisa diubah; tanpa DELETE |
| `kloter_mentors` | tidak berubah | Informasi saja; tidak ikut menentukan akses naskah (§3.9) |
| `user_seasons` | `user_id`, `season_id`, `kloter_daftar_id` **NULL-able**, **`jenis`**, `sumber` | Kloter kosong = pembeli arsip, dikunci CHECK ke `jenis` (§3.7) |
| `video_progress` → **`kuis_peserta`** | `user_id`, `kelas_id`, **`soal_terpilih uuid[] NOT NULL DEFAULT '{}'`**, `jawaban_soal jsonb NULL`, `skor` | ~~`ditonton`~~ dibuang (turunan dari `jawaban_soal IS NOT NULL`); +undian tersimpan. `skor` = jumlah benar, bukan persen |
| `writing_submissions` | tidak berubah | `kloter_id` tetap **kloter jendela** (D6). Yang lahir bukan kolom, tapi view `naskah_mengikat` |
| `certificates` | tidak berubah dari §1.2 | **Tertahan §4.1.** Rencana: ~~`jenis`~~ dibuang, +`nilai_kuis`, `rubrik_konten`, `rubrik_bahasa`, `catatan_mentor` (kolom eksplisit, bukan jsonb) |

#### Domain Pengguna & Kajian Offline

| Tabel | Sesudah | Δ |
|---|---|---|
| `users` | tidak berubah dari §1.2 | `usia` dan `profile_completed` hanya ada di cloud; tidak dibawa saat deploy (§4.5) |
| `event_sessions` | + **`rekaman_url text NULL`** | +1. Rekaman melekat di acaranya, bukan di kloter (opsi A) |
| `bookings` | tidak berubah | `qr_token UNIQUE` sudah ada (S3 tertutup) |
| `hero_content` | tidak berubah | — |

#### View — 1 → 2

| View | Ganti dari | Kenapa |
|---|---|---|
| ~~`kloter_aktif`~~ | — | `ORDER BY … LIMIT 1` menjatuhkan kloter N secara sistematis (B1) |
| **`kloter_dalam_fase`** | `kloter_aktif` | `now() ∈ [b1, b5)` + `status='berjalan'` + season berjalan. Unik *by construction* lewat GiST parsial, jadi tak perlu `LIMIT` |
| **`naskah_mengikat`** | — | Satu tempat untuk aturan §3.5. Wajib ada supaya "Selesaikan Kloter" tidak menghitung naskah latihan (§5.2) |

#### Constraint sesudah

| Constraint | Keadaan |
|---|---|
| `kloter_tidak_overlap` | **diganti** — rentangnya jadi `[tanggal_mulai, tgl_tenggat_setor)` dan parsial `WHERE status <> 'draft'`. Ekor masa penilaian bebas menjuntai (D3) |
| ~~`fase_tidak_overlap`~~ | hilang bersama `kloter_phases` |
| **`urutan_tanggal_valid`** | baru — ketat semua kecuali `b2 <= b3` (D5) |
| **`status_valid`**, **`selesai_setelah_tenggat`**, **`wrapped_menutup`** | baru — mengunci `status` ke 3 nilai dan melarang `status`/`tanggal_selesai` berselisih |
| **`jumlah_soal_tampil BETWEEN 1 AND 20`** | baru |
| **`ambang_pengingat_positif`** | baru |
| **`kunci_menunjuk_pilihan`** | baru — `kunci` selalu indeks yang ada di `pilihan` |
| **`arsip_tanpa_kloter`** | baru — `jenis = 'arsip'` ⇔ kloter kosong |
| `kloter_daftar_se_season` | baru — FK komposit: kloter asal milik season yang sama |
| `btree_gist` | **tidak dipakai lagi** — constraint anti-bentrok tinggal rentang tanggal, yang di-GiST-kan bawaan Postgres |

#### Hak akses sesudah

| Objek | Aturan |
|---|---|
| `seasons`, `kloters` | admin tulis langsung, kecuali kolom status (§3.10) |
| `kelas`, `soal`, `event_sessions` | admin tulis langsung |
| Bucket `karya-tulis` | private, PDF/DOC/DOCX maks 10 MB; peserta INSERT ke foldernya; baca lewat plug-in; tanpa UPDATE/DELETE (§3.9) |
| Kolom rahasia | `kelas.video_url`, `kloters.livestream_url`, `event_sessions.rekaman_url` — hak SELECT per kolom dicabut; dibaca lewat RPC |
| Visibilitas publik | season `terbit`, kloter non-draft, kelas milik season terbit. Sisanya hanya admin |

#### Peta fungsi sekarang — 14 RPC publik

Dari 7 jadi 14. Yang berubah kontraknya bukan yang paling banyak, tapi yang paling berbahaya.

**Zona A — peserta**

| RPC | Nasib |
|---|---|
| `create_booking` | tidak berubah |
| `update_profile` | tidak berubah |
| `setor_karya` | gerbangnya pindah sumber ke `kloter_dalam_fase`; `p_file_url` tetap |
| `get_video_url` | **diperbaiki** — ambang dari `tgl_mulai_menyimak` **kloter asal user**, tanpa batas atas (§5.1 + H1); arsip langsung terbuka; admin selalu |
| ~~`submit_classroom_progress`~~ | **dibelah** — kontraknya memikul dua pekerjaan bertentangan |
| **`get_soal_kelas`** | baru — menyajikan soal tanpa `kunci`, mengunci undian saat pertama dipanggil |
| **`jawab_kuis`** | baru — sekali saja, skor dihitung server; hanya `bimbingan`, selama `status_jendela_kuis` = `terbuka` |
| **`get_season_peristiwa`** | baru — livestream + rekaman offline, gerbang kepemilikan season tanpa komponen waktu |
| **`get_status_kuis`** | baru — status kuis 6 kelas untuk layar (`belum_buka`/`terbuka`/`tutup`/`sudah_dijawab`/`belum_tersedia`); hanya `bimbingan` |

**Zona B — admin/mentor**

| RPC | Nasib |
|---|---|
| `nilai_karya` | gerbang pindah ke `boleh_menilai_naskah` (§3.9); menolak naskah latihan (§3.5) |
| `check_in_booking` | tidak berubah |
| **`ubah_status_season`** | baru — terbitkan, batal terbit, tutup (A3b) |
| **`ubah_status_kloter`** | baru — publikasikan, batal publikasi, selesaikan (validasi lewat `naskah_mengikat`) |
| **`daftarkan_peserta`** | baru — admin dan service role (§3.8) |
| **`koreksi_kunci`** | baru — admin; betulkan kunci dan hitung ulang skor terdampak (§3.2) |

**Zona C — `app_internal`**

`is_admin()`, `is_staff()`, `guard_tanggal_sesi()`, `handle_new_user()`, `rls_auto_enable()` tidak berubah. **Baru:** plug-in `boleh_menilai_naskah(p_path)`, `status_jendela_kuis(p_kloter_id)`, `hitung_nilai_kuis(p_user_season_id)`; pembantu `hitung_skor_kuis(...)`, `gerbang_kuis(p_kelas_id)`, `is_penilai()`. **Dihapus:** `is_mentor_for_kloter()`.

Jalur pendaftaran season (H8) sekarang punya pintu: `daftarkan_peserta` (§3.8).

---

## 4. Yang masih bolong

### 4.1 Tertahan ke tim media — desain raport

Bentuk `certificates` tidak bisa ditutup tanpa tahu apa yang tercetak di dokumennya. Yang perlu dipastikan:

1. **Nama mentor penilai** — dicantumkan?
2. **Judul karya tulis** — dicantumkan? ⚠️ Judul naskah **tidak tersimpan di sistem**; hanya `file_url`. Kalau dicetak, peserta harus mengisi kolom judul saat setor — mengubah form peserta dan `setor_karya`, bukan cuma sertifikatnya. Ini yang paling mendesak karena efeknya naik ke hulu. Kalau judul disimpan per versi, raport mengambil judul versi mengikat terakhir (S9).
3. **Kaidah ke-N + nama season** — dicantumkan? (Nomor kloter sebaiknya tidak — istilah internal, tidak diekspos ke user.)
4. **Periode belajar** — dicantumkan?
5. **Nomor seri sertifikat** untuk verifikasi — perlu?

Pertimbangan tambahan: membekukan **artefaknya** (render PDF sekali saat terbit, simpan di bucket privat) memberi jaminan lebih kuat daripada membekukan bahannya. Tidak menggantikan kolom — kolom tetap dibutuhkan untuk mengueri sebaran nilai. Generator PDF-nya sendiri belum ada.

### 4.2 Tertahan ke pengelola mentor — G10 pembagian naskah

**D4 di-hold, dibawa ke tim.** Jawabannya menentukan mekanisme, dan opsi partisi deterministik gugur kalau susunan mentor bisa berubah di tengah.

43 naskah, 3 mentor, satu daftar. Tanpa pembagian, ketiganya membuka naskah teratas. Notion: *"ketiganya bisa membaca karya yang sama atau ada yang terlewat."*

Yang perlu dijawab:
1. Siapa yang membagi — sistem otomatis atau admin?
2. **Susunan mentor bisa berubah di tengah masa penilaian?** Ini yang menentukan bentuknya.
3. Admin perlu progres per mentor, atau cukup total?

| Mekanisme | Biaya | Kelemahan |
|---|---|---|
| Partisi deterministik (`row_number() % n`) | nol kolom, nol kerja admin | Susunan mentor berubah → seluruh sisa antrean berpindah tangan |
| `mentor_id` tersimpan, diisi saat jendela tutup | satu kolom + satu langkah | Bergantung aksi admin; kalau lupa, antrean tidak terdistribusi sama sekali |
| Ambil-sendiri (`FOR UPDATE SKIP LOCKED`) | nol kolom, menyeimbangkan diri | Admin kehilangan visibilitas per mentor; klaim terlantar butuh pelepasan |
| **Hibrida** — deterministik sebagai default, kolom tersimpan sebagai override | satu kolom nullable | Dua jalur yang harus konsisten |

**H4 — dua konsekuensi yang harus ikut dicatat apa pun pilihannya:**

- Penugasan per naskah cukup mengganti isi `boleh_menilai_naskah` (§3.9); `nilai_karya` dan kedua policy ikut berganti tanpa disentuh. Selama isinya masih "semua mentor", atribusi per mentor belum bisa dipegang atau diaudit.
- Penugasan tersimpan ditambah endpoint penugasan ulang menutup perubahan roster **tanpa migrasi skema** — jadi D4 tidak perlu dijawab sempurna sebelum implementasi, cukup dijawab sebelum gerbangnya dikunci.

Sisa G10 sekarang **hanya** soal pembagian ini. Bagian "filter karya asli vs susulan" larut sendiri: susulan tidak masuk antrean mentor.

**Sementara D4 di-hold:** semua mentor boleh membaca dan menilai semua naskah, lewat plug-in `boleh_menilai_naskah` (§3.9). Mekanisme mana pun yang dipilih nanti cukup mengganti isi fungsi itu, plus tabel penugasannya.

### 4.3 Kuis — prasyarat paket sertifikat

Statusnya berubah dua kali. H3 menjadikannya **prasyarat** paket sertifikat, bukan item yang bisa diparkir terpisah. Lalu keputusan 6 Sep membuat desainnya tertutup penuh — lihat §3.2 (bank soal, undian tersimpan, satu kesempatan).

**H11 tertutup.** Kebijakan retake terjawab: satu kesempatan, kiriman pertama mengikat. Tidak ada reset undian, tidak ada pertanyaan "skor mana yang naik". Notion D10 yang terbuka sejak 19 Agt ikut tertutup.

Alasannya bahkan menjawab dirinya sendiri: Notion sudah memutuskan skor tidak ditampilkan ke peserta (D3c) dan jawaban benar tidak ditampilkan (D10). Peserta yang mengulang tidak tahu skornya, tidak tahu mana yang salah, dan dengan undian tersimpan mendapat soal yang sama persis. Mengulang jadi menebak ulang tanpa informasi baru.

**Bentuknya berubah 25 Sep:** kuis berbentuk **jendela kloter asal**, bukan ambang: hanya selama fase menyimak `[b3, b4)`, lewat plug-in `status_jendela_kuis` (§3.2). Raport membekukan nilai kuis saat kloter ditutup, jadi kuis yang masih terbuka sesudahnya akan menghasilkan nilai yang tidak pernah masuk ke mana pun. Dengan jendela, kelas yang tidak dikerjakan otomatis bernilai 0.

**Yang tersisa bukan lagi keputusan skema, tapi kapasitas penulisan soal.** Supaya undian berguna, bank perlu jauh lebih besar dari yang ditampilkan: dengan N=10 dan M=5, dua peserta rata-rata berbagi 2–3 soal; dengan N=15, M=5, kemungkinan dua orang dapat lima soal identik praktis nol. Patokan kasarnya **N ≥ 3×M**, yang untuk 6 video berarti sekitar 90 soal per season alih-alih 30.

Selama bank ≥ jumlah yang ditampilkan, mekanismenya jalan; bank yang pas-pasan hanya menipiskan manfaat anti-nyontek. Jadi angka ini tidak memblokir migrasi tabelnya. Angka realistisnya belum ditetapkan.

**H9 — "hard deadline" tanpa penegak.** Notion menyebut tenggat penilaian sebagai *hard deadline yang mengunci penerbitan sertifikat*, tapi `target_penilaian` cuma timestamp internal. Kalau terlewat dan kloter masih `berjalan`, tidak ada apa pun yang menandai keterlambatan ke admin selain badge. Siapa yang mengingatkan, dan bagaimana, belum ditetapkan. Konsisten dengan B.2 (tanpa auto-wrap) berarti penegakannya memang manusia — tapi itu perlu dinyatakan, bukan diasumsikan.

### 4.4 Terangkat, belum ditutup

| Item | Keadaan |
|---|---|
| **Payment gateway** | Desain checkout dengan tenggat sudah ada di §3.8. Pilihan gateway, tabel `pembayaran`, dan webhook ditunda sebagai bagian tersendiri |
| **Layout admin: topbar vs sidebar** | Dua mockup ada di `docs/admin-mockup.html`, belum dipilih. `AdminLayout` sekarang hanya gerbang peran |
| **`.docx` → PDF** | Tiga jalan disodorkan (konversi di klien / di backend / edukasi + fallback), belum dipilih. Bucket menerima PDF/DOC/DOCX; mockup mentor mengasumsikan semuanya PDF |
| **Keputusan Notion yang terbalik** | "Kloter melekat di karyanya" (26 Agt), D15 *"penilaian mengikuti kloter karyanya"*, dan "kuis = ambang" (6 Sep). Pindahkan ke tabel *Keputusan yang pernah dibalik*, jangan dihapus |

Yang **keluar** dari daftar ini karena sudah terjawab: sinkronisasi dua level status (D1 + A3b), gerbang tautan livestream (§3.4), nama tabel kuis (`kuis_peserta`), ambang "tenggat mendekat" (§3.2), override fase (§3.2), `kloter_daftar_id` untuk arsip (§3.7), jalur pendaftaran H8 (§3.8), `bookings.qr_token` UNIQUE (ada), kebijakan bucket S4 (§3.9), dan file menggantung S10 (mockup dipindah ke `docs/`, `graphify-out/` diabaikan Git, dump cloud dihapus).

### 4.5 Cloud dan jalan deploy

Preflight 25 Sep (`supabase db dump --linked`, skema dan data):

- Cloud hanya punya 4 tabel versi Fase 1: `users`, `event_sessions`, `bookings`, `hero_content`. **Satu pun dari 18 migrasi belum pernah dijalankan di sana.**
- Isinya akun tester: 11 user, 11 booking, 3 sesi. Tidak ada data peserta sungguhan.
- Skema lama: `users` masih punya `usia` dan `profile_completed` dengan role hanya `user`/`admin`; `bookings` tanpa `jumlah_anak`; `event_sessions` masih punya `tipe`.
- `bookings.qr_token` UNIQUE sudah ada.

Karena itu migrasi digabung jadi satu baseline (§7). Baseline tidak bisa dijalankan langsung di atas cloud, karena tabel `users` lama sudah ada di sana. Deploy yang **mempertahankan akun**:

1. Ekspor `auth.users` dan `public.users`.
2. Reset database cloud.
3. Jalankan baseline.
4. Impor akun ke kolom baru. `usia` dan `profile_completed` tidak dibawa; peserta mengisi `tanggal_lahir` lewat progressive profiling.

Skrip impornya ditulis saat deploy, bukan sekarang.

Sampai deploy dijalankan, cloud masih berskema Fase 1. Jangan jalankan `npm run db:push` atau `db:types:linked`: baseline akan gagal di atas tabel `users` lama, dan types yang dibuat dari cloud akan memundurkan kode. Kerja pakai Supabase lokal. Deploy **ditunda** atas keputusan Akami.

### 4.6 Menggantung sejak sebelum sesi ini

| Item | Risiko |
|---|---|
| **5W2H `/admin/karya`** | Notion Log Sesi `CHAT-15` ditandai *Perlu tindak lanjut = YES*. Dua blocker yang disebut: pembagian beban mentor (= §4.2) dan filter asli-vs-susulan (larut sendiri). Sisanya menunggu D4 |
| **H4 sisa (Notion)** | Jendela setor dibuka berapa lama sebelum tenggat. Nilai tanggal, tidak memblokir bentuk skema |
| **Layar "sedang dinilai"** | Notion menandainya sebagai *sisa ketergantungan H5*. Layar `wrapped` yang tergambar isinya sertifikat, bukan masa tunggu — kemungkinan satu layar belum punya gambar. Mode layar nomor 7 di §3.3 |
| **Wireframe rev 2.3 pakai istilah lama** | "bulan ini" / "berulang tiap bulan" — setor mengikuti jadwal kloter, 6× setahun bukan 12× |
| **`kuota_terisi` / `kuota_kids_terisi`** (H5) | Turunan tersimpan tanpa jalur penurun: tidak ada RPC cancel booking. `create_booking` sudah memegang `FOR UPDATE` di baris sesi, jadi `count(bookings aktif) < kapasitas` di bawah lock yang sama sama amannya tanpa risiko drift. PR-03 sudah mencabut hak update kolom ini dari `authenticated`, yang memperkuat argumen menghapusnya. **Dilacak sebagai PR-04 di `REVIEW_ACTION_TRACKER.md` — jangan dilacak dua kali** |

---

## 5. Cacat yang ditemukan sebelum baseline — sudah ditutup

Ketiganya ditutup baseline 25 Sep dan diikat tes regresi di §8. Uraian di bawah dipertahankan sebagai alasan desain.

### 5.1 Gerbang materi mengunci dua kelompok, dengan dua sebab berbeda

Terverifikasi dari kode. `get_video_url` di `20260830000000_fix_rls_policies_and_errcodes.sql:141-148`:

```sql
SELECT 1 FROM public.kloter_aktif ka
JOIN public.kloter_phases kp ON kp.kloter_id = ka.id
WHERE ka.season_id = v_season_id
  AND kp.phase IN ('menyimak','menulis_setor','wrapped')
  AND now() >= kp.opens_at
  AND now() < kp.closes_at
```

Dari satu join lahir **dua penguncian yang berbeda**, dan membedakannya penting karena perbaikan yang salah menutup satu dan meninggalkan satu:

| Yang terkunci | Sebab | Yang harus dicabut |
|---|---|---|
| **Pemilik season arsip** | Batas atas `now() < kp.closes_at` — fase sudah lewat, jadi gagal | Batas atas, karena video = ambang bukan jendela |
| **Semua anggota season, tiap awal siklus** | Join ke `kloter_aktif` — selama kloter terbaru masih di `pendaftaran` atau `orientasi`, tidak ada fase yang cocok | **Join ke kloter aktif**, diganti kloter asal user |

Kelompok kedua (H1) lebih luas dan lebih sering: bukan sekali untuk pemilik arsip, tapi **berulang tiap awal siklus kloter** — dan Notion menyiratkan 6 siklus setahun. Memperbaiki batas atas saja tidak menutupnya.

Notion memperingatkan pola ini secara eksplisit: *"kalau dicek terhadap fase aktif, pemilik arsip tidak akan bisa menonton apa pun."*

Sisi TypeScript-nya benar (`getUserSeasonOwnership` mengambil `menyimakOpensAt` milik kloter user, lalu `canAccessVideo` membandingkannya) — jadi DB dan TS berbeda pendapat, dan yang salah justru lapis yang menegakkan.

**Gerbang yang sama disalin ke `submit_classroom_progress`** (`20260831020000:130-139`) tapi **tanpa** `now() < kp.closes_at`. Keduanya salah sumber. Bentuk yang benar: video = ambang dari kloter asal; kuis = jendela fase menyimak kloter asal (§3.2).

Perbaikan masuk baseline (§7).

### 5.2 Tombol "Selesaikan Kloter" akan macet permanen

Terverifikasi dari kode. `setor_karya` (`20260831020000:344-371`) menulis:

```sql
INSERT INTO public.writing_submissions (user_id, kloter_id, versi, file_url)
VALUES (v_user_id, v_kloter_id, v_versi, v_clean_path)
```

dengan `v_kloter_id` diambil dari `kloter_aktif`. Jadi naskah latihan **benar-benar tercatat sebagai naskah kloter yang sedang berjalan**, bukan cuma "menumpuk lintas kloter". Nomor `versi` pun melanjutkan urutan kloter itu.

Akibatnya, validasi "semua naskah mengikat sudah dinilai" yang ditulis naif:

```sql
SELECT count(*) FROM writing_submissions
WHERE kloter_id = K AND status = 'menunggu'
```

ikut menghitung naskah latihan, yang tidak akan pernah dinilai siapa pun. Hitungannya tidak akan pernah nol → tombol tidak pernah aktif → kloter tidak bisa ditutup → raport tidak terbit.

Yang membuatnya jahat: kloter 1 tidak punya naskah latihan, jadi kesalahan ini **lolos di kloter pertama** dan baru muncul di kloter kedua — saat sistem sudah dipakai sungguhan. Dan latihan menumpuk: jendela kloter 3 menerima latihan dari anggota kloter 1 dan 2.

Waktu itu kodenya belum ada, tapi jalur mekanisnya sudah terpasang di DB. Karena itu §3.5 mewajibkan satu view `naskah_mengikat`, bukan filter per query; `ubah_status_kloter` memakainya.

### 5.3 Nilai kuis dari klien akan masuk dokumen resmi

`submit_classroom_progress` (`20260831020000`) menerima `p_quiz_score integer` sebagai argumen dan menuliskannya ke `video_progress.skor`. Tidak ada tabel soal, tidak ada kunci jawaban, tidak ada perhitungan di sisi DB.

Jalur eksploitasinya sepele: klien memanggil RPC lewat PostgREST dengan `p_quiz_score` = 100 tanpa menjawab satu soal pun. Gerbang yang ada hanya memeriksa kepemilikan dan fase, tidak pernah memeriksa kewajaran angkanya.

Selama nilai kuis tidak dilihat siapa pun, ini kecurangan tanpa akibat — dan memang itu penilaian awalnya. Yang mengubah bobotnya adalah keputusan tim 5 Sep: **nilai kuis dicetak di raport**. Angka karangan klien jadi angka di dokumen resmi bernama raport, dan sertifikat itu artefak yang beredar keluar.

**Jalur penutupannya sekarang jelas.** Keputusan 6 Sep (bank soal + kunci di server + satu kesempatan) membuat `p_quiz_score` tidak punya alasan untuk ada: klien mengirim `jawaban`, server mencocokkannya ke `kunci` dari `soal_terpilih`. Tidak ada lagi tempat untuk mengirim angka karangan. Detail bentuknya di §3.2.

Perbaikan masuk baseline (§7). Tabel `soal` boleh kosong saat migrasi; isinya menyusul.

---

## 6. Yang jadi basi di dokumen lain

`docs/ARCHITECTURE.md` sudah disunting ulang 25 Sep: hierarki 4 fase, anti-overlap `[b1, b5)` parsial, `kloter_dalam_fase`, gerbang per bentuk, kuis, naskah, kaidah jalur tulis, invarian vs kebijakan, dan status season turunan. Satu yang masih menunggu: §5.2 di sana baru menyebut rencana raport, kolomnya menyusul bersama §4.1.

Di Notion:

| Halaman | Yang perlu disunting |
|---|---|
| *Keputusan yang pernah dibalik* | Tambah tiga entri (§4.4) |
| `/app/season/[id]/setor` | *"Karya untuk kloter 4 dinilai mentor kloter 4"* — terbalik |
| `Pertanyaan Terbuka` D15 | *"Penilaian mengikuti kloter karyanya"* — terbalik. Sisa pertanyaannya ("hasil di dua kloter, mana yang berlaku") tertutup |
| `Pertanyaan Terbuka` D3d/D3e | Tertutup oleh update tim — semua lulus |
| `Pertanyaan Terbuka` H5 | Tertutup oleh A.3 + nilai kuis ditahan. Tidak perlu status parsial di skema. Tapi **layar** "sedang dinilai" tetap perlu digambar |
| `Pertanyaan Terbuka` A3b | Terjawab: penutupan season mensyaratkan tidak ada kloter berjalan |
| `Pertanyaan Terbuka` D10 sisa | = H11. **Tertutup:** satu kesempatan, kiriman pertama mengikat |
| `/app/season/[id]/kelas/[n]` | *"18–30 soal berbeda **per kloter**"* — frasanya longgar dan menyesatkan. Soal melekat di `kelas` (level season), berbeda antar video. Kalau dibaca harfiah, jadi beban penulisan soal 6× setahun |
| `/app/season/[id]/kelas/[n]` | Tambah: bank soal lebih besar dari yang ditampilkan, diundi per peserta, undian dikunci saat kuis dibuka, satu kesempatan |
| Halaman beli season | Dua produk: bimbingan (hanya di fase pendaftaran kloter) dan arsip (season sudah selesai), harga berbeda |
| `/app/season/[id]/kelas/[n]` | Kuis hanya selama kloter asal; pembeli arsip tidak mendapat kuis |
| `Pertanyaan Terbuka` — baru | Tambah §4.1 (desain raport) dan §4.2 (G10 pembagian, D4) |

---

## 7. Urutan pengerjaan

| # | Langkah | Prasyarat | Status |
|---|---|---|---|
| 1 | **Kerja dokumen** | — | ✅ revisi 25 Sep |
| 2 | **Preflight cloud** | — | ✅ akun tester, §4.5 |
| 3 | **Satu baseline migrasi** — gabungan 18 migrasi lama + seluruh §3: kolom `kloters` dan `seasons.terbit`, `user_seasons.jenis`, `kloter_dalam_fase`, `naskah_mengikat`, `soal` + `kuis_peserta`, peristiwa, bucket + plug-in naskah, kaidah jalur tulis + hak kolom, 14 RPC, perbaikan §5.1–§5.3 | — | ✅ `750ae31` |
| 4 | **Kode aplikasi**: types, service season/kelas/naskah, route kuis; test §8 | 3 | ✅ `63aeeed`, `32b3c33` |
| 5 | **Beres-beres**: mockup ke `docs/`, `graphify-out/` ke `.gitignore`, hapus dump cloud | — | ✅ |
| 6 | **Deploy cloud** (§4.5) | 3, 4 | ⏸ ditunda |
| 7 | **D4** → isi plug-in → 5W2H `/admin/karya` | D4 dari tim | ⬜ di-hold |
| 8 | **§4.1** desain raport → paket sertifikat H3 → generator PDF | tim media | ⬜ |
| 9 | **Payment gateway** (§3.8) | — | ⬜ ditunda |
| 10 | **H5 lewat PR-04** → H9 → S1–S10 sisa | — | ⬜ |

Penulisan isi soal (~90 butir per season, §4.3) berjalan paralel dengan semuanya.

---

## 8. Test yang mengikat keputusan

Sepuluh skenario, ditulis sebagai tes pgTAP di `supabase/tests/baseline.test.sql` (56 assertion; `supabase test db`, jalan di CI). Satu transaksi dengan `now()` tetap, jadi fase kloter digeser dengan mengubah tanggal b1–b5. Tiga pertama mengikat cacat yang **terbaca di kode** — statusnya regresi.

| # | Test | Mengikat | Kenapa ini yang dipilih |
|---|---|---|---|
| 1 | Pemilik season arsip berhasil `get_video_url` | §5.1 penguncian pertama | Uji lakmus nomor 5 dalam bentuk eksekusi |
| 2 | Anggota kloter 2 menonton materi saat kloter 4 masih fase `pendaftaran` | §5.1 penguncian kedua (H1) | Tanpa ini, perbaikan §5.1 bisa lolos sambil menyisakan separuh masalah — dan separuh itu yang kena semua orang |
| 3 | Kloter 2 ditutup sementara ada naskah latihan dari anggota kloter 1 | §5.2 | Pola "lolos di kloter 1, meledak di kloter 2" adalah spesifikasi test gratis |
| 4 | Pembeli arsip: `get_video_url` berhasil, `jawab_kuis` dan `setor_karya` ditolak | §3.7 | Kloter kosong tidak boleh bocor ke gerbang lain |
| 5 | Dua `daftarkan_peserta` bersamaan untuk kursi terakhir — hanya satu yang lolos | §3.8 | Kapasitas baru pertama kali ditegakkan; balapan adalah cara ia gagal |
| 6 | Mentor membuka naskah peserta mana pun; peserta lain tidak bisa | §3.9 | Plug-in + Storage policy; sebelum baseline mentor sama sekali tidak bisa membaca naskah |
| 7 | Admin mengubah `kloters.status` lewat tulis langsung — ditolak | §3.10 | Hak kolom yang menjaga status hanya berpindah lewat RPC |
| 8 | Kunci dikoreksi setelah dua peserta menjawab — skor keduanya berubah, raport yang sudah terbit tidak | §3.2 | Jalur yang menulis ulang nilai; salah di sini langsung salah di nilai orang |
| 9 | Peserta setor v1, v2, v3; mentor menilai v3 saja; kloter bisa diselesaikan | §3.5 | Definisi "versi terakhir" di `naskah_mengikat` — tanpanya kloter macet persis seperti §5.2 |
| 10 | `jawab_kuis` di b4 tepat — ditolak; sedetik sebelumnya — diterima | §3.2 | Batas jendela plug-in; salah satu arah berarti kuis terbuka terlalu lama atau tertutup terlalu cepat |

Dua celah cakupan yang disadari:

- **Test 5** menguji penolakan saat kapasitas penuh, bukan balapan dua pendaftaran bersamaan — itu tidak bisa dibuat dalam satu transaksi. Perlindungannya `FOR UPDATE` pada baris kloter, terbukti hanya lewat pembacaan kode.
- **Test 8** belum menguji bagian "raport yang sudah terbit tidak berubah", karena kolom nilai di `certificates` masih tertahan §4.1.
