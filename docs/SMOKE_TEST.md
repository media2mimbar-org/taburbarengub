# Smoke Test Checklist — TaburBarengUB

Gunakan checklist ini setelah deploy, setelah migration Supabase, atau setelah perubahan yang menyentuh auth, booking, classroom, tugas naskah, admin, QR, atau RLS.

---

## 0. Environment

- [ ] App yang diuji adalah URL deploy yang benar.
- [ ] Supabase project yang dipakai adalah production/staging yang benar.
- [ ] Migration remote sudah sinkron:
  ```bash
  npx supabase migration list --linked
  ```
  Per 25 Sep cloud **belum** menjalankan baseline (deploy ditunda, `docs/BACKEND.md` §4.5). Bagian 5 dan 6 hanya bisa diuji di Supabase lokal sampai deploy selesai.
- [ ] Jangan uji production dengan `.env.development.local` yang masih menunjuk ke Supabase lokal.

---

## 1. Public Landing & Beranda

- [ ] `/` terbuka tanpa login.
- [ ] Hero content tampil dinamis dari database.
- [ ] `Sesi Mendatang` hanya menampilkan sesi published yang belum lewat.
- [ ] Sesi `draft` tidak tampil di publik.
- [ ] Sesi offline future punya tombol `Lihat Detail`.
- [ ] Fallback sapaan navbar menampilkan `"Sahabat Tabur"` jika user login belum mengisi nama/panggilan.

---

## 2. Auth & Progressive Profiling

- [ ] User baru bisa register dengan email/password.
- [ ] Row akun baru muncul di `auth.users` dan trigger `app_internal.handle_new_user()` membuat profil di `public.users`.
- [ ] Kolom `users.nama` murni bernilai `NULL` (tanpa teks palsu) jika tidak dikirim saat signup.
- [ ] Nomor WhatsApp otomatis dinormalkan ke format `628...` (misal: `08123` atau `+628123` menjadi `628123`).
- [ ] Tanggal lahir tersimpan dengan format ISO `YYYY-MM-DD` dan tervalidasi `<= CURRENT_DATE`.
- [ ] User bisa login dan logout dengan lancar.
- [ ] `/forgot-password` mengirim email reset dan password baru bisa disimpan di `/reset-password`.

---

## 3. Booking Kajian Offline & Kids Corner

Siapkan sesi offline published dengan tanggal masa depan dan kuota tersedia.

- [ ] User login tanpa nomor WhatsApp akan dicegat `TB109` (`NO_HP_DIPERLUKAN`) dan diminta memasukkan nomor WA (bukan form 6-field kaku).
- [ ] User bisa memilih jumlah anak untuk Kids Corner (0 sampai 5 anak).
- [ ] Jika kuota Kids Corner habis, booking dengan anak ditolak `TB108` (`KIDS_CORNER_PENUH`), namun booking 0 anak tetap berhasil jika kursi dewasa tersedia.
- [ ] Setelah sukses booking, kuota kursi (`kuota_terisi`) dan kuota anak (`kuota_kids_terisi`) bertambah secara atomik.
- [ ] Tiket tampil di `/tiket-saya` dengan status `Booked`.
- [ ] Klik tiket membuka halaman detail dengan kode QR unik (`/tiket-saya/[id]`).
- [ ] Booking kedua untuk sesi yang sama ditolak (`TB105`).
- [ ] Sesi lampau (`TB104`) dan sesi penuh (`TB103`) ditolak.

---

## 4. QR Check-in (Scanner)

Gunakan HP/browser admin/staff untuk test scanner di HTTPS deploy URL.

- [ ] Admin/staff membuka `/admin/scanner`.
- [ ] Browser meminta izin kamera.
- [ ] QR tiket valid menghasilkan `Check-in berhasil`.
- [ ] Hasil check-in menampilkan nama peserta, nama sesi, dan jadwal sesi.
- [ ] `bookings.status` berubah menjadi `checked_in` dan `checked_in_at` terisi.
- [ ] Scan ulang QR yang sama menghasilkan `QR sudah dipakai` (`TB202`).
- [ ] QR palsu/random menghasilkan `QR tidak valid` (`TB201`).
- [ ] User non-admin/non-staff tidak bisa memanggil endpoint check-in.

---

## 5. Season & Kloter (Kelas Online, Video, & Kuis)

Aturan gerbang di bawah sudah diuji otomatis oleh `npx supabase test db`. Smoke test di sini memastikan layar membaca hasil yang sama.

- [ ] **Video (ambang):**
  - User tanpa `user_seasons` melihat semua video terkunci.
  - Peserta bimbingan sebelum b3 (`tgl_mulai_menyimak`) kloter asalnya melihat video terkunci; sesudahnya terbuka dan tetap terbuka.
  - Pembeli arsip langsung bisa menonton video season arsip.
- [ ] **Kuis:**
  - Kuis hanya bisa dibuka selama fase menyimak kloter asal (`GET /api/classroom/kuis?kelas_id=`), menyajikan soal tanpa kunci.
  - Membuka ulang menampilkan soal yang sama (undian tersimpan).
  - Kelas dengan bank soal kurang tampil "belum tersedia".
  - Jawaban dikirim sekali (`POST /api/classroom/kuis`); kiriman kedua ditolak (`KUIS_SUDAH_DIJAWAB`). Skor tidak ditampilkan ke peserta.
  - Pembeli arsip tidak mendapat kuis.

---

## 6. Pengumpulan Naskah Tugas & Grading

- [ ] **Jendela setor `[b4, b5)`:**
  - Di luar jendela, setor ditolak (`JENDELA_SETOR_TERTUTUP`).
  - Berkas diunggah ke bucket `karya-tulis` di folder `{user_id}/…`; unggah ke folder orang lain ditolak.
  - Setor berulang menaikkan nomor versi (Versi 1, Versi 2, dst.). Berkas lama tidak bisa ditimpa atau dihapus.
- [ ] **Penilaian mentor/admin:**
  - Sebelum tenggat setor (b5), penilaian ditolak (`PENILAIAN_BELUM_DIBUKA`).
  - Hanya versi terakhir di kloter asal yang bisa dinilai; naskah latihan dan versi lama ditolak (`BUKAN_NASKAH_MENGIKAT`).
  - Mentor bisa membuka berkas naskah lewat signed URL; peserta lain tidak.
  - Kloter hanya bisa diselesaikan setelah semua naskah mengikat dinilai.

---

## 7. Admin Peserta & CSV Export

- [ ] `/admin/peserta` bisa memilih sesi.
- [ ] Peserta booking muncul di tabel beserta jumlah anak Kids Corner.
- [ ] Status `booked` / `checked_in` tampil benar.
- [ ] Export CSV terdownload dengan aman (bebas formula injection spreadsheet).
- [ ] User non-admin ditolak saat mengakses export CSV.

---

## 8. Navigasi Lintas Halaman

- [ ] Navigasi normal `/` → `/tiket-saya` → tiket detail, lalu klik tombol "Kembali" 2x kembali ke `/` secara instan.
- [ ] Buka URL tiket detail langsung di tab baru (simulasi link dibagikan), lalu klik "Kembali". Harus mengarah ke `/tiket-saya` atau `/` tanpa keluar dari aplikasi.
- [ ] Buka `/admin/scanner` langsung di tab baru, klik "Kembali". Harus kembali ke `/admin`.

---

## 9. Quality & Build Checks

Sebelum deploy ke production:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npx supabase test db
npx supabase db advisors --local
```

Semua perintah di atas wajib lulus tanpa error. Advisors wajib 0 temuan.
