> **Diarsipkan 26 Sep 2026.** Semua temuan di sini sudah tertutup atau dilacak di `docs/BACKEND.md` §4. Dari dokumen lain, kode di sini dirujuk dengan awalan `RB-` (RB-H5, RB-S1, RB-D4, …), karena huruf yang sama dipakai Pertanyaan Terbuka Notion untuk hal lain. Isi di bawah dibiarkan apa adanya.

# Temuan gabungan review `BACKEND.md`

Disusun 2026-09-05 atas `docs/BACKEND.md` di branch `rombak/backend`, HEAD `4135a14`.

Dokumen ini menggabungkan tiga review independen, membuang duplikat, dan mengurutkan temuan
menurut tingkat. Tujuannya satu: dipakai sebagai daftar kerja saat merevisi `BACKEND.md`.
Ini bukan tracker status. Begitu sebuah item mulai dikerjakan, promosikan jadi entri
`PR-17` dan seterusnya di `REVIEW_ACTION_TRACKER.md`, yang tetap jadi sumber status aktual.

## Untuk sesi yang menerima dokumen ini

Dokumen ini ditulis oleh sesi lain yang tidak punya riwayat penyusunan `BACKEND.md`. Kata "aku"
di bawah merujuk ke sesi itu, bukan ke kamu.

- Bagian "Verifikasi kode" adalah hasil membaca migrasi asli pada commit `4135a14`, lengkap
  dengan `file:baris`. Jangan diverifikasi ulang, dan jangan dibantah tanpa membuka baris yang
  dikutip. Kalau repo sudah bergerak dari `4135a14`, baru cek ulang.
- Selain bagian itu, semuanya bacaan atas teks. Kalau kamu punya konteks penyusunan yang
  membatalkan sebuah temuan, tulis pembatalannya beserta alasan, jangan dihapus diam-diam.
- D1 sampai D5 adalah keputusan Akami. Jangan diputuskan sendiri dan jangan diasumsikan. Tiga di
  antaranya memblokir item `BLOKIR`.
- Mulai dari "Urutan pengerjaan". Langkah 3 murni menyunting `BACKEND.md` dan tidak menyentuh
  kode, jadi itu titik masuk paling aman.

## Sumber

| Tag | File | Karakter |
|---|---|---|
| `OX` | `review-by-ox_alpha.md` | Editorial dan tata kelola keputusan. Skor 9/10 |
| `GLM` | `Review-BACKEND.md-by-glm_5_3.md` | Tangga severity, cross-check angka, 8 temuan bernomor |
| `AR` | `REVIEW-BACKEND-arena_ai.md` | 12 temuan, paling dalam soal konsekuensi arsitektur |

Ketiganya menyatakan eksplisit bahwa mereka hanya membaca teks `BACKEND.md`. Nol kode dibaca,
nol perintah dijalankan. Karena itu bagian "Verifikasi kode" di bawah ada: aku membaca migrasi
aslinya untuk menguji premis yang paling menanggung beban. Aku juga tidak menjalankan apa pun.

Dua catatan soal sumber:

- File `OX` rusak sebagian. Banyak karakter hilang di tengah kata (`BACK.md`, commit `413a14`,
  "engapa", "bu dihapus", "§3.)"). Kelihatannya masalah transfer, bukan salah tulis. Jangan
  dikutip verbatim.
- Kesimpulan `OX` bahwa semua cacat yang ditemukan "bersifat kosmetik-struktural, bukan
  substantif" tidak selamat setelah dibaca berdampingan. B1 dan H1 substantif.

## Tangga tingkat

| Tingkat | Arti |
|---|---|
| `BLOKIR` | Tutup sebelum migrasi §3.2 ditulis. Masing-masing mengubah bentuk akhir skema atau spesifikasi |
| `HARUS` | Wajib ditutup, tapi tidak mengubah bentuk migrasi |
| `SEBAIKNYA` | Kualitas dan higiene. Masuk backlog |

Tangga ini milik `GLM`. Tingkat `tinggi/sedang/rendah` dari `AR` dipetakan masuk. Di tiga tempat
aku menaikkan tingkat dari penilaian aslinya, dan alasannya ditulis di temuan yang bersangkutan
supaya tidak ada penilaian yang diam-diam berubah.

## Daftar temuan

| ID | Temuan | Tingkat | Sifat | Menyentuh | Sumber |
|---|---|---|---|---|---|
| B1 | `kloter_aktif` tak terdefinisi saat dua kloter `berjalan` | BLOKIR | gap spesifikasi + cacat berjalan | §3.2 §3.3 §3.4 §3.5 | GLM AR |
| B2 | Constraint kolom baru §3.2 belum lengkap | BLOKIR | gap spesifikasi | §3.2 | GLM AR OX |
| B3 | Cakupan "kepemilikan season" tidak dispesifikasikan | BLOKIR | gap spesifikasi + cacat berjalan | §1.4 §3.4 §3.5 | GLM |
| B4 | `livestream_url` / `livestream_at` tanpa sumber dan tanpa gerbang | BLOKIR | gap provenance + gap spesifikasi | §3.1 §3.2 §3.4 | OX GLM AR |
| B5 | Aturan backfill fase lama ke b1..b5 belum ditulis | BLOKIR | gap spesifikasi | §3.2 §4.5 | AR GLM |
| H1 | Cacat §5.1 lebih luas: video terkunci untuk semua di awal siklus | HARUS | cacat berjalan | §5.1 §1.5 | AR |
| H2 | §5.3 terlalu tipis untuk cacat yang sedang berjalan | HARUS | gap dokumentasi | §5.3 §4.3 | OX |
| H3 | Paket sertifikat diblokir dua hal, dokumen mencatat satu | HARUS | konsekuensi belum dicatat | §3.6 §4.1 §4.3 | AR |
| H4 | Revisi §4.2 mekanisme pembagian naskah | HARUS | konsekuensi belum dicatat | §4.2 | OX GLM AR |
| H5 | `kuota_terisi` / `kuota_kids_terisi` turunan tanpa jalur penurun | HARUS | pelanggaran uji turunan | §1.2 §1.4 | GLM AR |
| H6 | Preflight produksi sebelum migrasi destruktif | HARUS | proses | §4.5 | OX GLM AR |
| H7 | Konversi `[INFERENCE]` jadi test regresi | HARUS | proses | §5 | GLM AR |
| H8 | Penegakan `kloters.kapasitas` dan jalur pendaftaran hilang dari peta RPC | HARUS | gap spesifikasi | §1.4 §4 | AR GLM |
| H9 | Masa penilaian: "hard deadline" Notion tanpa penegak | HARUS | gap operasional | §3.3 §4.3 | OX |
| H10 | Mode layar tidak pernah dienumerasi | HARUS | gap spesifikasi | §3.3 | AR |
| H11 | Kebijakan retake kuis belum ada | HARUS | gap spesifikasi | §4.3 | AR |
| H12 | Sinkronisasi `seasons.status` dan `kloters.status` | HARUS | lihat D1 | §4.4 | OX AR |

Item `SEBAIKNYA` ada di bagiannya sendiri. Empat keputusan yang tidak bisa diputuskan sepihak
ada di "Keputusan yang menunggu kamu".

## Verifikasi kode

Ketiga review tidak membaca kode. Lima premis yang paling menanggung beban aku uji langsung ke
migrasi. Hasilnya mengubah isi tiga temuan, jadi jangan lewati bagian ini.

### 1. `kloter_aktif` punya `ORDER BY`. Dua review keliru soal ini

`supabase/migrations/20260829000000_season_kloter_core.sql:121-135`:

```sql
CREATE VIEW public.kloter_aktif WITH (security_invoker = true) AS
SELECT k.*, coalesce(<fase override>, <fase where now() >= opens_at AND now() < closes_at>) AS fase
FROM public.kloters k
JOIN public.seasons s ON s.id = k.season_id
WHERE k.tanggal_mulai <= now()
  AND coalesce(k.tanggal_selesai, 'infinity'::timestamptz) > now()
  AND s.status = 'berjalan'
ORDER BY k.tanggal_mulai DESC
LIMIT 1;
```

`GLM` menulis "`LIMIT 1` tanpa `ORDER BY` ambigu" dan `AR` menulis "kalau dua baris cocok,
pilihan menjadi nondeterministik". Keduanya salah. `ORDER BY k.tanggal_mulai DESC` ada.

Kabar buruknya, ini lebih jelek daripada nondeterministik. Saat kloter N masih di masa penilaian
dan kloter N+1 sudah mulai, view **selalu** memilih N+1 dan menjatuhkan N tanpa suara. Bukan
lotere yang kadang benar, tapi salah yang konsisten dan berulang tiap siklus. Konsekuensi layar
yang ditulis `GLM` tetap berlaku, malah lebih pasti.

Dua fakta lain dari kode yang tidak disebut review mana pun:

- Filter aktifnya `tanggal_mulai <= now() AND coalesce(tanggal_selesai,'infinity') > now()`.
  Ini definisi "aktif" **ketiga**, berbeda dari jendela fase `[b1,b5)` dan dari
  `status = 'berjalan'`. Jadi B1 bukan cuma soal mendefinisikan yang belum ada, tapi merapikan
  tiga definisi yang sudah hidup bersamaan.
- View menyaring `s.status = 'berjalan'` (season), bukan `k.status`. Kolom `kloters.status` tidak
  pernah dibaca di sini. Ini menyentuh D1.

### 2. Cacat §5.1 terkonfirmasi, dan gerbangnya ada dua versi yang tidak sepakat

Fungsi yang dimaksud §5.1 adalah `get_video_url` di
`20260830000000_fix_rls_policies_and_errcodes.sql:109-154`. Gerbang fasenya di baris 141-148:

```sql
-- menyimak phase must be active in current kloter
IF NOT EXISTS (
  SELECT 1 FROM public.kloter_aktif ka
  JOIN public.kloter_phases kp ON kp.kloter_id = ka.id
  WHERE ka.season_id = v_season_id
    AND kp.phase IN ('menyimak', 'menulis_setor', 'wrapped')
    AND now() >= kp.opens_at
    AND now() < kp.closes_at
) THEN
  RETURN NULL;
END IF;
```

Gerbang memeriksa fase **kloter aktif**, dan `kloter_aktif` cuma memuat satu baris, yaitu kloter
yang paling baru mulai. Dari situ lahir dua penguncian dengan mekanisme berbeda, dan dokumen baru
mencatat yang pertama:

- **Pemilik arsip terkunci permanen**, yaitu §5.1 seperti tertulis. Penyebabnya batas atas
  `now() < kp.closes_at`. Begitu fase-fase kloter itu lewat, tidak ada lagi baris yang memenuhi
  syarat, dan materinya tertutup selamanya.
- **Semua orang terkunci di awal siklus**, yaitu H1 dari `AR` R2. Penyebabnya join ke kloter
  aktif. Selama kloter terbaru masih di `pendaftaran` atau `orientasi`, tidak ada baris fase
  miliknya yang memenuhi syarat, jadi materi terkunci untuk **seluruh anggota season itu**,
  termasuk anggota kloter sebelumnya yang ambangnya sudah lewat berbulan-bulan.

Sisi TypeScript memakai kloter asal user, jadi mengizinkan. DB dan TS berbeda pendapat, persis
pola §1.5. Akar bersama kedua penguncian adalah join ke kloter aktif, jadi memperbaiki batas atas
saja tidak menutup H1.

Gerbang yang sama disalin ke `submit_classroom_progress`
(`20260831020000_harden_classroom_quiz_and_mentor_grading.sql:130-139`) tapi **tanpa**
`now() < kp.closes_at`. Dua RPC yang menjaga sumber daya berkaitan jadi tidak sepakat: satu
berbasis jendela, satu berbasis ambang. Salah satu dari keduanya salah, dan §3.4 harus menyatakan
yang mana.

### 3. `setor_karya` menjawab B3, dan menemukan atribusi yang salah

`20260831020000:344-371`:

```sql
SELECT id, season_id, fase INTO v_kloter_id, v_season_id, v_fase FROM public.kloter_aktif;
...
PERFORM 1 FROM public.user_seasons
WHERE user_id = v_user_id AND season_id = v_season_id FOR UPDATE;
...
INSERT INTO public.writing_submissions (user_id, kloter_id, versi, file_url)
VALUES (v_user_id, v_kloter_id, v_versi, v_clean_path)
```

Jadi bacaan yang berlaku sekarang adalah bacaan (a) `GLM`: kepemilikan diukur terhadap season
**kloter aktif**. Konsekuensinya bercabang dua, dan yang kedua lebih serius:

- Anggota kloter lama dari season yang **berbeda** ditolak dengan `BUKAN_SEASON_MILIK`. Janji
  §3.5 tidak terpenuhi, persis seperti dugaan `GLM`.
- Anggota kloter lama dari season yang **sama** lolos gerbang, tapi naskahnya masuk dengan
  `kloter_id = v_kloter_id`, yaitu **kloter aktif**, bukan kloter asalnya. Nomor `versi` pun
  melanjutkan urutan kloter aktif. Ini penjelasan mekanis untuk §5.2: naskah latihan tidak cuma
  "menumpuk lintas kloter", ia benar-benar tercatat sebagai naskah kloter yang sedang berjalan,
  jadi validasi penutupan kloter memang akan menghitungnya. §5.2 berhenti jadi `[INFERENCE]`.

Sekalian: `get_video_url` (`20260830000000:133-138`) dan `submit_classroom_progress`
(`20260831020000:121-127`) sama-sama memakai bacaan (b), yaitu season milik `kelas` yang diminta,
dicek terhadap `user_seasons` tanpa syarat kloter aktif. Jadi di repo yang sama sudah hidup dua
bacaan atas frasa yang sama di §1.4: `setor_karya` memakai (a), dua RPC classroom memakai (b).
Itu bukti terkuat kenapa B3 harus ditutup sebelum apa pun ditulis.

### 4. Drop `usia` tidak punya backfill

`20260829030000_progressive_profile_and_certificate_snapshot.sql:82-92` melakukan
`drop column if exists usia` lalu `add column if not exists tanggal_lahir date`. Tidak ada
`UPDATE` yang memindahkan nilai. `AR` menulis "pastikan `usia` sudah bermigrasi atau datanya
memang kosong di produksi". Sekarang bisa dipertegas: migrasinya **tidak** memindahkan apa pun.
Pertanyaannya tinggal apakah `usia` di produksi memang boleh hilang. Kalau tidak, backfill harus
ditulis sebelum push. Ini justru jenis barang yang H6 dirancang untuk menangkap.

### 5. HEAD tepat di commit yang direview

`git log --oneline -1` di `rombak/backend` mengembalikan `4135a14`, commit yang dikutip ketiga
review. Tidak ada temuan yang basi karena repo bergerak.

## BLOKIR

### B1 · `kloter_aktif` tak terdefinisi saat dua kloter `berjalan`

Sumber `GLM` T1 dan `AR` R1. Menyentuh §3.2, §3.3, §3.4, §3.5.

GiST baru hanya mengunci `[b1, b5)`. Kloter N yang sudah lewat b5 tapi belum di-`wrap` masih
`berjalan` saat kloter N+1 mulai, dan itu memang konsisten dengan keputusan "pendaftaran dibuka
tepat setelah kajian offline selesai".

```
kloter N     |-- b1 -- b2 -- b3 -- b4 ------- b5 ==============| wrap
                                                 masa penilaian
kloter N+1                                    |-- b1 -- b2 -- b3 -->
                                              ^
                                   dua baris status='berjalan' bersamaan
```

Yang belum ditulis di dokumen:

1. View `kloter_aktif` tidak didefinisikan ulang. Lihat verifikasi 1: view yang ada memilih
   kloter yang paling baru mulai dan menjatuhkan kloter N secara sistematis, dan definisi
   "aktif"-nya sendiri sudah berbeda dari `[b1,b5)`.
2. Resolusi mode layar mengambil tanggal kloter aktif, jadi anggota kloter N di masa penilaian
   diresolusi memakai tanggal kloter N+1 dan mendapat layar fase alih-alih "sedang dinilai".
   Kena semua anggota kloter sebelumnya sepanjang masa tumpang tindih.
3. Gerbang setor §3.4, resolusi mode §3.3, dan klaim §3.5 semuanya berpijak pada definisi yang
   tidak ada.

Suntingan yang dituntut: pisahkan dua turunan yang berbeda, dan tulis keduanya di §3.3.

- `kloter_dalam_fase`: kloter dengan `now() ∈ [tanggal_mulai, tgl_tenggat_setor)` dan
  `status = 'berjalan'`. Unik by construction berkat GiST, jadi `ORDER BY ... LIMIT 1` tidak
  lagi menyembunyikan apa pun. Dipakai gerbang setor dan penentuan fase layar.
- Kloter asal user: lewat `user_seasons.kloter_daftar_id`, lalu status dan tanggal kloter itu.
  Dipakai layar "sedang dinilai" (`status = 'berjalan' AND now() >= tgl_tenggat_setor`) dan
  raport.

Tambahkan juga satu baris bahwa gap `[b5_N, b1_{N+1})` memang tidak punya kloter aktif, dan itu
benar karena jendela setor sedang tutup.

Tertahan D3.

### B2 · Constraint kolom baru §3.2 belum lengkap

Sumber `GLM` T2, `AR` R7 dan R9, `OX` #7. Menyentuh §3.2.

`tanggal_selesai` tidak dibandingkan dengan apa pun, tidak ada jaminan `status = 'wrapped'`
sejalan dengan `tanggal_selesai IS NOT NULL`, dan `status` bertipe `text` tanpa `CHECK` padahal
skema lama di §1.2 punya. Tambahkan:

```sql
CONSTRAINT status_valid CHECK (status IN ('draft','berjalan','wrapped'))
CONSTRAINT selesai_setelah_tenggat CHECK (
  tanggal_selesai IS NULL OR tanggal_selesai >= tgl_tenggat_setor
)
CONSTRAINT wrapped_menutup CHECK (
  (status = 'wrapped') = (tanggal_selesai IS NOT NULL)
)
```

Tertahan D5 untuk satu hal lagi: fase durasi nol. `<=` sekarang membolehkan `b4 = b5`, artinya
jendela setor kosong, tidak ada yang bisa setor, semua nilai kosong, raport kosong, dan skema
tidak menganggap ada yang salah.

### B3 · Cakupan "kepemilikan season" tidak dispesifikasikan

Sumber `GLM` T3. Menyentuh §1.4, §3.4, §3.5.

§1.4 cuma menulis "kepemilikan season" padahal dua bacaannya memberi hasil berlawanan, dan
verifikasi 3 menunjukkan **dua RPC di repo sudah memilih bacaan yang berbeda**. `setor_karya`
memakai season kloter aktif, `submit_classroom_progress` memakai season apa pun milik user.

Suntingan: definisikan di §3.4 sebagai "user punya baris `user_seasons` untuk season kloter
aktif", lalu samakan kedua RPC dan tulis test-nya.

Satu perbaikan tambahan yang wajib ikut, dan ini di luar temuan ketiga review: `setor_karya`
harus menulis `kloter_id` milik **kloter asal user**, bukan kloter aktif. Selama masih memakai
kloter aktif, naskah latihan tercatat sebagai naskah kloter yang berjalan dan validasi penutupan
akan menghitungnya. Ini akar §5.2, bukan gejalanya. View `naskah_mengikat` tetap perlu, tapi
tanpa perbaikan atribusi ini view itu menambal di lapisan yang salah.

### B4 · `livestream_url` / `livestream_at` tanpa sumber dan tanpa gerbang

Sumber `OX` #2, `GLM` T4, `AR` R11. Menyentuh §3.1, §3.2, §3.4. Disepakati bertiga.

Dua kolom ini muncul di tabel target §3.2 tanpa entri di tabel keputusan §3.1. Ini satu-satunya
bagian dokumen yang kehilangan jejak sumber, di dokumen yang justru kekuatan utamanya provenance
per keputusan.

Gerbangnya juga belum dibahas, dan risikonya nyata: `kelas.video_url` sengaja dicabut dari
SELECT publik dan digate lewat RPC. Kalau kolom livestream bisa di-SELECT lewat PostgREST, link
siaran bocor sebelum waktunya lewat pintu yang baru saja ditutup untuk video. Ambangnya juga
belum diputuskan, apakah b4, sejak b3, atau publik.

Suntingan: tambah baris keputusan di §3.1 dan baris gerbang di §3.4. Kalau sumber keputusannya
memang belum ada, pindahkan kedua kolom ke §4 sebagai bolong. Jangan dibiarkan di §3 seolah
sudah diputuskan.

### B5 · Aturan backfill fase lama ke b1..b5 belum ditulis

Sumber `AR` R4 dan `GLM` temuan kecil. Menyentuh §3.2, §4.5.

Dinaikkan dari `sedang` dan `kecil` ke `BLOKIR`. Alasannya definisi tangga itu sendiri:
aturan backfill adalah bagian dari menulis migrasi §3.2, bukan pekerjaan sesudahnya.

`fase_tidak_overlap` di model lama hanya melarang tumpang tindih, jadi **celah antar fase legal**
di data yang ada. Kolom baru yang `NOT NULL` butuh kebijakan pemetaan eksplisit:

- b2, b3, b4 diambil dari `opens_at` fase yang bersangkutan, sehingga celah hilang sendiri
- b5 diambil dari `closes_at` fase `menulis_setor`
- fase wajib yang hilang atau `NULL` harus diputuskan: migrasi gagal keras, atau ada default

Untuk drop kolom lama, verifikasi 4 menutup pertanyaannya: migrasi `20260829030000` men-drop
`usia` tanpa backfill apa pun ke `tanggal_lahir`. §4.5 sendiri mencatat preflight **belum pernah
dijalankan** dan produksi punya 11 user, jadi nilai `usia` 11 orang itu masih ada di sana dan akan
hilang begitu push pertama jalan. Putuskan sebelum push apakah itu memang boleh. `profile_completed`
dan `event_sessions.tipe` ada di rombongan drop yang sama menurut §4.5.

## HARUS

### H1 · Cacat §5.1 lebih luas: video terkunci untuk semua di awal siklus

Sumber `AR` R2. Terkonfirmasi dari kode, lihat verifikasi 2. Ini cacat yang sedang berjalan,
jadi urgensinya paling tinggi di kelompok ini meski tidak mengubah bentuk migrasi.

Dokumen menulis §5.1 sebagai masalah pemilik season arsip. Sebenarnya lebih luas: selama kloter
terbaru masih di `pendaftaran` atau `orientasi`, materi terkunci untuk semua anggota season itu.
Kalau satu season memuat beberapa kloter, dan "6× setahun" di §4.5 menyiratkan begitu, ini
terulang **tiap awal siklus kloter**, bukan sekali untuk pemilik arsip.

Suntingan: perluas §5.1, dan turunkan tingkatnya dari `[INFERENCE]` jadi terverifikasi dengan
rujukan `20260830000000:141-148`. Catat juga bahwa penyebab kedua penguncian berbeda, dan yang
harus dicabut untuk menutup H1 adalah join ke kloter aktif, bukan batas atas `closes_at`. Sekalian
putuskan di §3.4 apakah gerbang materi berbasis jendela seperti `get_video_url` atau berbasis
ambang seperti `submit_classroom_progress`, karena sekarang keduanya berbeda.

### H2 · §5.3 terlalu tipis untuk cacat yang sedang berjalan

Sumber `OX` #5. Menyentuh §5.3, §4.3.

Skor kuis dari klien masuk dokumen resmi itu cacat yang sedang berjalan, bukan dugaan, tapi cuma
dapat satu kalimat dan rujukan ke §4.3. Untuk bobot itu, perlakuannya harus seperti §5.1: kutip
kode, jelaskan jalur eksploitasinya, dan klasifikasikan apakah perbaikannya bisa dikerjakan
terpisah dari §3.2.

Dokumentasinya bisa ditulis sekarang. Perbaikannya ikut §4.3 di langkah 5.

### H3 · Paket sertifikat diblokir dua hal, dokumen mencatat satu

Sumber `AR` R3. Menyentuh §3.6, §4.1, §4.3.

§3.6 menulis certificates tertahan §4.1. Tapi raport membekukan nilai kuis, dan §5.3 dengan §4.3
menutup jalan angka dari klien. Jadi kerja kuis server-side adalah **prasyarat** paket
certificates, bukan item yang bisa diparkir terpisah. Tulis eksplisit: paket = §4.1 + §4.3.

Efek sampingnya menaikkan H11, karena bentuk tabel soal di §4.3 sekarang memblokir sesuatu.

### H4 · Revisi §4.2 mekanisme pembagian naskah

Sumber `OX` #4, `GLM` T5, `AR` catatan §4.2. Disepakati bertiga dari tiga sudut berbeda, dan
ketiganya kompatibel. Gabung jadi satu revisi, jangan dipilih salah satu.

- Konsekuensi yang belum dicatat (`GLM`): kalau opsi 2 dipilih, gerbang `nilai_karya` harus ikut
  berganti dari `is_mentor_for_kloter()` ke penugasan per naskah. Selama gerbangnya tidak
  berubah, mentor kloter mana pun sah menilai naskah siapa pun, dan atribusi yang jadi alasan
  memilih opsi 2 tidak bisa dipegang atau diaudit.
- Kelemahan yang disembunyikan (`OX`): kolom kelemahan mekanisme kedua diisi strip seolah bebas
  cacat. Kelemahan riilnya bergantung aksi admin manual. Kalau ada 43 naskah dan admin lupa,
  antrean tidak terdistribusi. Usul hibrida: deterministik sebagai default, kolom tersimpan
  sebagai override.
- Cakupan (`AR`): opsi 2 ditambah endpoint penugasan ulang menutup perubahan roster tanpa
  migrasi skema.

Tertahan D4.

### H5 · `kuota_terisi` / `kuota_kids_terisi` turunan tanpa jalur penurun

Sumber `GLM` T6 dan `AR` R6. Menyentuh §1.2, §1.4.

Melanggar uji turunan dokumen sendiri di §2.3. `bookings.status` punya `'cancelled'`, sementara
peta RPC §1.4 tidak punya jalur cancel, jadi tidak ada yang terdokumentasi menurunkan counter.
Argumen `AR` yang paling bersih: `create_booking` sudah memegang `FOR UPDATE` di baris sesi, jadi
`count(bookings aktif) < kapasitas` di bawah lock yang sama sama amannya, tanpa risiko drift.

Pilih satu: turunkan via `count` dan hapus kolomnya, atau pertahankan kolom, tulis alasannya,
dan tambah RPC cancel yang menurunkan di bawah lock yang sama.

Item ini sudah punya rumah di `REVIEW_ACTION_TRACKER.md` sebagai PR-04 (booking lifecycle,
cancellation, quota reconciliation, status `TODO`). Jangan dilacak dua kali. Perhatikan juga
PR-03 sudah `DONE` mencabut hak update `kuota_terisi` dari `authenticated` lewat column grants,
jadi penurunan manual admin lewat PostgREST sekarang mustahil. Itu memperkuat argumen menghapus
kolomnya.

### H6 · Preflight produksi sebelum migrasi destruktif

Sumber `OX` tindak lanjut #2, `GLM` T7, `AR` urutan #2. Disepakati bertiga, dan ini langkah nomor
satu di urutan pengerjaan.

Resep paling konkret dari `AR`: `supabase db dump` produksi, restore ke lokal atau staging yang
segar, jalankan push 18 migrasi yang sudah ada, verifikasi. 11 user dan 11 booking itu kecil,
dump-nya cepat. Jangan menumpuk migrasi destruktif §3.2 di atas jarak lokal dan produksi yang
belum pernah diuji.

Verifikasi 4 memberi satu item konkret yang harus dicek di preflight ini: apakah `usia` di
produksi masih terpakai, karena migrasi yang menunggu akan men-drop-nya tanpa backfill.

### H7 · Konversi `[INFERENCE]` jadi test regresi

Sumber `GLM` T8 dan usul test `AR`. Menyentuh §5.

`BACKEND.md` sendiri menyatakan klaim `[INFERENCE]` jangan diperlakukan sebagai fakta sebelum
ada test. Tiga yang paling bernilai ada di bagian "Test yang harus lahir" di bawah.

Perhatikan bahwa verifikasi 2 dan 3 sudah mengubah §5.1 dan §5.2 dari dugaan jadi terbaca di
kode. Test-nya tetap perlu, tapi sekarang statusnya regresi atas cacat yang diketahui, bukan
eksperimen untuk membuktikan dugaan.

### H8 · Penegakan `kloters.kapasitas` dan jalur pendaftaran hilang dari peta RPC

Sumber `AR` R5 dan `GLM` temuan kecil. Menyentuh §1.4, §4.

Peta RPC §1.4 tidak memuat jalur pendaftaran season, yaitu write ke `user_seasons`. Kalau
jalurnya insert manual admin, maka `kapasitas` dan invarian `kloter_daftar_id = kloter aktif saat
daftar` tidak ditegakkan di DB mana pun. Satu paragraf di §4 cukup. Cek dulu apakah sudah
terdokumentasi di `ARCHITECTURE.md`.

### H9 · Masa penilaian: "hard deadline" Notion tanpa penegak

Sumber `OX` #3. Menyentuh §3.3, §4.3.

§3.3 menjadikan masa penilaian murni turunan dari `now() >= tgl_tenggat_setor AND status =
'berjalan'`. Bersih sebagai model, tapi `target_penilaian` cuma timestamp internal. Kalau
terlewat dan kloter masih `berjalan`, tidak ada mekanisme apa pun yang menandai keterlambatan ke
admin. Notion menyebut tenggat penilaian sebagai hard deadline yang mengunci penerbitan
sertifikat, dan tidak ada yang menegakkan kata "hard" itu di sisi data.

Suntingan: satu kalimat di §4.3 atau §4.5 tentang siapa yang mengingatkan dan bagaimana.

### H10 · Mode layar tidak pernah dienumerasi

Sumber `AR` R12. Dinaikkan dari `rendah` ke `HARUS` dengan dua alasan: konsep ini tidak bisa
dites selama daftarnya tidak ada, dan §3.3 adalah permukaan yang B1 ubah, jadi keduanya sebaiknya
disunting sekali jalan.

Dokumen menyebut sekitar 9 mode layar, Notion punya 7 prioritas, dan pemetaannya tidak ada.
Lampirkan daftarnya sekali di §3.3 beserta pemetaan ke 7 prioritas Notion.

### H11 · Kebijakan retake kuis belum ada

Sumber `AR` R10. Dinaikkan dari `rendah` ke `HARUS` karena H3 menjadikan §4.3 prasyarat paket
sertifikat, jadi pertanyaan ini sekarang memblokir sesuatu.

`submit_classroom_progress` upsert atau append per kelas? Skor yang diakumulasi yang terakhir
atau yang terbaik? Jawaban ini menentukan bentuk tabel soal dan kunci di §4.3, dan jauh lebih
murah dijawab sekarang daripada saat tabelnya sudah dirancang.

### H12 · Sinkronisasi `seasons.status` dan `kloters.status`

Sumber `OX` #1 dan `AR` R9. Menyentuh §4.4 baris 4. Resolusi ada di D1, karena kedua usul
bergerak ke arah berlawanan.

## SEBAIKNYA

| ID | Temuan | Sumber |
|---|---|---|
| S1 | Kosakata status tidak seragam: `seasons.status = 'selesai'` vs `kloters.status = 'wrapped'` untuk konsep paralel. Samakan atau petakan eksplisit | GLM AR |
| S2 | Kloter `draft` ikut kena EXCLUDE, jadi dua skenario jadwal tentatif tidak boleh tumpang tindih. Kalau panitia butuh menyiapkan jadwal alternatif, perlu partial index `WHERE status <> 'draft'`. Minimal putuskan sadar | AR GLM |
| S3 | Nyatakan `qr_token` UNIQUE sebagai constraint. `check_in_booking` mengandalkannya sebagai kunci | GLM |
| S4 | Kebijakan storage bucket naskah (peserta tulis, mentor baca) tidak disebut. Cek apakah ada di dokumen lain | GLM |
| S5 | `target_selesai` dan `rekomendasi` disebut di Konsekuensi §3.1 tanpa keadaan as-is di §1. Satu kalimat per item agar dokumen mandiri | GLM |
| S6 | `hero_content` tidak pernah dibahas lagi setelah tabel skema §1.2. Siapa pemiliknya, kapan terakhir diubah | OX |
| S7 | Diagram §3.2 tidak menampilkan `antara_kloter` dan `offline`. Satu baris catatan bahwa keduanya hidup di gap `[b5_N, b1_{N+1})` mencegah salah baca bahwa kloter nempel terus tanpa jeda | AR |
| S8 | Tambah penanda kebasian: satu baris "dokumen berlaku sampai commit X berubah" | OX |
| S9 | Kalau judul karya disimpan per versi, raport mengambil judul versi mengikat terakhir. Detail desain §4.1 | AR |
| S10 | File menggantung: `graphify-out/` masuk `.gitignore`, `public/admin-mockup.html` di-commit atau dihapus | GLM AR |

## Keputusan yang menunggu Akami

Lima hal di bawah tidak bisa diputuskan dari kode atau dokumen, dan bukan wewenang sesi mana pun.
Tiga di antaranya memblokir item `BLOKIR`.

### D1 · Sinkronisasi status dua level

`OX` minta trigger: `kloters.status` hanya boleh `berjalan` kalau season-nya `berjalan`.
`AR` justru sebaliknya: `seasons.status` sendiri kandidat kuat uji turunan, bisa diturunkan dari
kloter-kloternya, dan itu menutup §4.4 baris 4 tanpa trigger sinkronisasi apa pun.

Bacaanku: `AR` menang menurut kerangka dokumen sendiri. Usul `OX` menambah turunan tersimpan,
jenis barang yang uji lakmus §2.3 dirancang untuk menolak. Verifikasi 1 memperkuat ini, karena
`kloter_aktif` sekarang menyaring `seasons.status` dan tidak pernah membaca `kloters.status`.
Menurunkan `seasons.status` dari kloter membuat satu-satunya sumber kebenaran ada di kloter.
Tapi ini keputusanmu, karena aku tidak tahu apakah panitia butuh menutup season secara manual
lebih awal dari kloter-kloternya.

### D2 · Sekuensing fix §5.1

`OX` dan `AR` bilang kerjakan sekarang dan terpisah, karena tidak bergantung bentuk akhir
`kloter_phases`. `GLM` bilang perbaikannya akan ditulis ulang oleh §3.2, jadi lipat keduanya ke
satu paket migrasi.

Trade-off aslinya: terpisah berarti perbaikan akses kontrol naik sekarang dengan biaya menulis
dua kali. Dilipat berarti satu paket bersih, tapi perbaikannya menunggu B1 sampai B5 tertutup.
Aku condong ke terpisah karena verifikasi 2 menunjukkan cacatnya terulang tiap awal siklus dan
mengunci materi untuk seluruh season, bukan cuma pemilik arsip. Kamu yang tahu kapan produksi
naik.

### D3 · Boleh tidak kloter N+1 dibuka sebelum kloter N di-`wrap`?

Ini keputusan bisnis yang menentukan bentuk rentang GiST, dan B1 tertahan olehnya.

- Boleh: rentang `[b1, b5)` seperti sekarang, dan B1 wajib memisahkan dua turunan.
- Tidak boleh: rentang `[b1, COALESCE(tanggal_selesai, b5))`, dengan konsekuensi jadwal kloter
  berikutnya tidak bisa ditetapkan sebelum kloter sekarang di-`wrap`.

Dokumen memilih `[b1, b5)` tanpa pernah membahas trade-off ini.

### D4 · §4.2 pertanyaan Q2, roster berubah di tengah?

Sudah terbuka di dokumen. Jawabannya menentukan mekanisme pembagian, dan opsi 1 gugur kalau
jawabannya "bisa". Menentukan isi H4.

### D5 · Fase durasi nol diniatkan?

`b1 = b2` untuk orientasi instan mungkin memang disengaja. `b4 = b5` hampir pasti tidak, karena
artinya jendela setor kosong dan raport kosong tanpa satu pun error. Kalau memang tidak
diniatkan, pakai `<` yang ketat untuk `tgl_mulai_setor` terhadap `tgl_tenggat_setor`. Menentukan
isi B2.

## Urutan pengerjaan

Ketiga review menyodorkan urutan, dan ketiganya menaruh preflight di depan. Ini gabungannya.

1. **H6 preflight cloud.** Sebelum apa pun yang destruktif, dan sebelum migrasi §3.2 ditulis.
   Sekalian jawab pertanyaan `usia` dari verifikasi 4.
2. **Fix §5.1 dan H1** beserta dua test-nya, atau lipat ke langkah 4 sesuai D2. Tulis juga
   dokumentasi H2 sekarang, perbaikannya menyusul di langkah 6.
3. **Tutup B1 sampai B5 di `BACKEND.md`.** Murni kerja dokumen, tidak menyentuh kode. Butuh D3
   dan D5 lebih dulu. Sekalian H10 karena menyentuh §3.3 yang sama.
4. **Satu paket migrasi:** §3.2, backfill B5, definisi `kloter_aktif` baru B1, constraint B2,
   kepemilikan season B3 termasuk perbaikan atribusi `kloter_id`, gerbang livestream B4, view
   `naskah_mengikat`, tombol Selesaikan Kloter, dan test H7.
5. **D4** lalu **H4**, kemudian 5W2H `/admin/karya`.
6. **H11** lalu §4.3 kuis server-side dan perbaikan H2, lalu §4.1, lalu paket sertifikat H3,
   lalu generator PDF.
7. **H5 lewat PR-04** di tracker. Lalu H8, H9. Lalu S1 sampai S10.

Item `OX` #6, yaitu "dokumen tidak punya urutan eksekusi", tertutup oleh bagian ini. Pindahkan
tabel ini ke `BACKEND.md` supaya dokumen itu berubah dari analisis jadi rencana.

## Test yang harus lahir

Ketiganya sepakat dokumen ini penuh klaim yang belum diikat test. Tiga yang bernilai, dan
sekarang dua di antaranya punya rujukan kode:

1. **Pemilik season arsip bisa `get_video_url`.** Mengikat §5.1.
2. **Anggota kloter 2 menonton materi saat kloter 4 masih fase pendaftaran.** Mengikat H1. Ini
   yang membedakan cacatnya dari "cuma soal arsip", dan tanpa test ini perbaikan §5.1 bisa lolos
   sambil menyisakan separuh masalah.
3. **Kloter 2 ditutup sementara ada naskah latihan dari anggota kloter 1.** Mengikat §5.2. Pola
   "lolos di kloter 1, meledak di kloter 2" adalah spesifikasi test gratis. Setelah perbaikan
   atribusi di B3, test ini juga harus memastikan naskah latihan tercatat di `kloter_id` asal
   penulisnya, bukan di kloter yang sedang berjalan.

## Peta dedup

Untuk melacak balik ke review aslinya.

| ID gabungan | `OX` | `GLM` | `AR` |
|---|---|---|---|
| B1 | — | T1 | R1 |
| B2 | #7 | T2 | R7, R9 |
| B3 | — | T3 | — |
| B4 | #2 | T4 | R11 |
| B5 | — | kecil "pemetaan migrasi" | R4 |
| H1 | — | — | R2 |
| H2 | #5 | — | — |
| H3 | — | — | R3 |
| H4 | #4 | T5 | catatan §4.2 |
| H5 | — | T6 | R6 |
| H6 | tindak lanjut #2 | T7 | urutan #2 |
| H7 | — | T8 | catatan §5.2, usul test R2 |
| H8 | — | kecil "jalur pendaftaran" | R5 |
| H9 | #3 | — | — |
| H10 | — | — | R12 |
| H11 | — | — | R10 |
| H12 | #1 | kecil "kosakata ganda" | R9 |
| S1 | — | kecil | R9 |
| S2 | — | kecil | R8 |
| S3 | — | kecil | — |
| S4 | — | kecil | — |
| S5 | — | kecil | — |
| S6 | #7 | — | — |
| S7 | — | — | editorial |
| S8 | #7 | — | — |
| S9 | — | — | catatan §4.1 |
| S10 | — | kecil | urutan #6 |
| Tertutup oleh dokumen ini | #6 urutan eksekusi | §3 urutan | §4 urutan |

Temuan yang tidak muncul di peta karena tidak selamat verifikasi: klaim `GLM` T1 dan `AR` R1
soal `LIMIT 1` nondeterministik. Lihat verifikasi 1.
