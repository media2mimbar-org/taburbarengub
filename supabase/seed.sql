-- ============================================================
-- Data contoh untuk pengembangan lokal.
--
-- Hanya dijalankan oleh `supabase db reset` / `supabase start`.
-- TIDAK PERNAH ikut ke produksi lewat `supabase db push`.
--
-- Tanggalnya relatif terhadap now() supaya tidak basi dan tidak
-- tertolak trigger guard_tanggal_sesi setiap beberapa hari.
-- ============================================================

insert into public.hero_content (id, judul_acara, filosofi_tabur, tagline, nama_pemateri, bio_pemateri)
values (
  1,
  'Tabur Bareng UB',
  'Tabur adalah ikhtiar menebar ilmu dan menumbuhkan kesadaran melalui tadabbur yang bertahap, terarah, dan konsisten.',
  'Tadabbur kekuatan muslimin yang tertidur',
  'Ustadz Budi Ashari',
  'Pemateri utama program Tabur Bareng UB.'
)
on conflict (id) do update set
  judul_acara    = excluded.judul_acara,
  filosofi_tabur = excluded.filosofi_tabur,
  tagline        = excluded.tagline,
  nama_pemateri  = excluded.nama_pemateri,
  bio_pemateri   = excluded.bio_pemateri;

-- Satu sesi per skenario yang perlu diuji di UI.
insert into public.event_sessions
  (nama_sesi, tanggal_waktu, lokasi_atau_link, deskripsi, kapasitas, kuota_terisi, kapasitas_kids, kuota_kids_terisi, status)
values
  -- Jalur bahagia: bisa dibooking + Kids Corner tersedia.
  ('Sesi 1 — Tadabbur Pembuka', now() + interval '10 days',
   'Masjid Raden Patah UB', 'Sesi pembuka yang terbuka untuk umum.', 60, 0, 15, 0, 'published'),

  -- Tombol harus mati dengan alasan "Kuota Penuh".
  ('Sesi 2 — Kelas Penuh', now() + interval '14 days',
   'Gedung Widyaloka UB', 'Dipakai untuk menguji tampilan kuota habis.', 5, 5, 0, 0, 'published'),

  -- Tidak boleh muncul di landing sama sekali.
  ('Sesi 3 — Draft Belum Terbit', now() + interval '30 days',
   'Belum ditentukan', 'Masih draft, hanya admin yang boleh melihat.', 50, 0, 10, 0, 'draft')
on conflict do nothing;
-- ============================================================
-- Seed Data Season 1 & Kloter 1
-- ============================================================
do $$
declare
  v_season_id uuid;
  v_kloter_id uuid;
begin
  -- 1. Insert Season 1 (Aktif/Berjalan)
  insert into public.seasons (nomor_kaidah, nama, tanggal_mulai, tanggal_selesai, status)
  values (
    1,
    'Kaidah 1: Mengagumi Keagungan Al-Quran',
    now() - interval '14 days',
    now() + interval '56 days',
    'berjalan'
  )
  returning id into v_season_id;

  -- 2. Insert Kloter 1 di Season 1
  insert into public.kloters (season_id, nomor, tanggal_mulai, tanggal_selesai, kapasitas)
  values (
    v_season_id,
    1,
    now() - interval '14 days',
    now() + interval '56 days',
    300
  )
  returning id into v_kloter_id;

  -- 3. Insert 7 Fase untuk Kloter 1 (Timeline relatif)
  insert into public.kloter_phases (kloter_id, phase, opens_at, closes_at)
  values
    (v_kloter_id, 'offline',        now() - interval '14 days', now() - interval '13 days'),
    (v_kloter_id, 'pendaftaran',    now() - interval '13 days', now() - interval '7 days'),
    (v_kloter_id, 'orientasi',      now() - interval '7 days',  now() - interval '2 days'),
    (v_kloter_id, 'menyimak',        now() - interval '2 days',  now() + interval '14 days'),
    (v_kloter_id, 'menulis_setor',  now() + interval '14 days', now() + interval '28 days'),
    (v_kloter_id, 'wrapped',        now() + interval '28 days', now() + interval '35 days'),
    (v_kloter_id, 'antara_kloter',  now() + interval '35 days', now() + interval '56 days');

  -- 4. Insert 6 Video Kelas untuk Season 1
  insert into public.kelas (season_id, nomor, judul, video_url)
  values
    (v_season_id, 1, 'Pengantar Kaidah Tadabbur Pertama', 'https://iframe.mediadelivery.net/embed/demo/kelas-1'),
    (v_season_id, 2, 'Menyelami Makna Ayat Pilihan',     'https://iframe.mediadelivery.net/embed/demo/kelas-2'),
    (v_season_id, 3, 'Refleksi Diri & Nilai Kehidupan',    'https://iframe.mediadelivery.net/embed/demo/kelas-3'),
    (v_season_id, 4, 'Studi Kasus dalam Keseharian',       'https://iframe.mediadelivery.net/embed/demo/kelas-4'),
    (v_season_id, 5, 'Menemukan Hikmah yang Tersembunyi',  'https://iframe.mediadelivery.net/embed/demo/kelas-5'),
    (v_season_id, 6, 'Rangkuman & Penguatan Komitmen',     'https://iframe.mediadelivery.net/embed/demo/kelas-6');

  -- 5. Hubungkan Sesi Offline Pembuka dengan Kloter 1
  update public.event_sessions
  set kloter_id = v_kloter_id
  where nama_sesi like 'Sesi 1%';
end $$;
