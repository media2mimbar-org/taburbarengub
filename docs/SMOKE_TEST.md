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

- [ ] **Threshold Video (`menyimak`):**
  - User yang belum memiliki `user_seasons` tidak bisa melihat URL video kelas (`canAccess = false`).
  - User pemilik season sebelum fase `menyimak` (sebelum `opens_at`) melihat video terkunci.
  - Saat fase `menyimak` aktif, RPC `get_video_url` mengembalikan streaming URL Bunny.net.
- [ ] **Kuis & Progress Video:**
  - Submit durasi video dan jawaban kuis ke `/api/classroom/progress` berhasil mencatat `video_progress`.
  - Nilai kuis dihitung otomatis (skor 0–100) dan tersimpan di database.

---

## 6. Pengumpulan Naskah Tugas & Grading

- [ ] **Jendela Setor (`menulis_setor`):**
  - Di luar fase `menulis_setor`, pengumpulan naskah ditolak (`22000` / `JENDELA_SETOR_TERTUTUP`).
  - Saat fase `menulis_setor` aktif, user pemilik season bisa submit link file naskah via `/api/submissions`.
  - Submit berulang menghasilkan auto-increment nomor versi naskah (Versi 1, Versi 2, dst.).
- [ ] **Grading Mentor/Admin:**
  - Mentor/admin bisa menilai naskah via `/api/admin/submissions/grade` (`nilai_karya` RPC).
  - Status naskah berubah menjadi `dinilai` dan payload penilaian JSONB tersimpan.

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
```

Semua 4 perintah di atas wajib lulus 100% tanpa error.
