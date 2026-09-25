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
-- Season 1 (berjalan, kloter 1 di fase menyimak) dan Season 0 (arsip).
-- ============================================================
do $$
declare
  v_season_id uuid;
  v_arsip_id  uuid;
  v_kloter_id uuid;
  v_kelas1_id uuid;
begin
  -- Season 0: sudah selesai, untuk menguji pembeli arsip.
  insert into public.seasons (nomor_kaidah, nama, tanggal_mulai, tanggal_selesai, terbit)
  values (0, 'Kaidah 0: Season Arsip Contoh', now() - interval '400 days', now() - interval '30 days', true)
  returning id into v_arsip_id;

  insert into public.kloters (season_id, nomor, kapasitas, status,
    tanggal_mulai, tgl_mulai_orientasi, tgl_mulai_menyimak, tgl_mulai_setor, tgl_tenggat_setor, tanggal_selesai)
  values (v_arsip_id, 1, 300, 'wrapped',
    now() - interval '400 days', now() - interval '394 days', now() - interval '389 days',
    now() - interval '373 days', now() - interval '359 days', now() - interval '340 days');

  insert into public.kelas (season_id, nomor, judul, video_url)
  values
    (v_arsip_id, 1, 'Arsip: Kelas Pertama', 'https://iframe.mediadelivery.net/embed/demo/arsip-1'),
    (v_arsip_id, 2, 'Arsip: Kelas Kedua',   'https://iframe.mediadelivery.net/embed/demo/arsip-2');

  -- Season 1: berjalan.
  insert into public.seasons (nomor_kaidah, nama, tanggal_mulai, terbit)
  values (1, 'Kaidah 1: Mengagumi Keagungan Al-Quran', now() - interval '14 days', true)
  returning id into v_season_id;

  -- Kloter 1: b1 … b5 relatif terhadap now(); sekarang di fase menyimak.
  insert into public.kloters (season_id, nomor, kapasitas, status,
    tanggal_mulai, tgl_mulai_orientasi, tgl_mulai_menyimak, tgl_mulai_setor, tgl_tenggat_setor,
    livestream_url, livestream_at)
  values (v_season_id, 1, 300, 'berjalan',
    now() - interval '13 days', now() - interval '7 days', now() - interval '2 days',
    now() + interval '14 days', now() + interval '28 days',
    'https://www.youtube.com/watch?v=demo-livestream-1', now() + interval '13 days')
  returning id into v_kloter_id;

  insert into public.kelas (season_id, nomor, judul, video_url)
  values
    (v_season_id, 1, 'Pengantar Kaidah Tadabbur Pertama', 'https://iframe.mediadelivery.net/embed/demo/kelas-1'),
    (v_season_id, 2, 'Menyelami Makna Ayat Pilihan',      'https://iframe.mediadelivery.net/embed/demo/kelas-2'),
    (v_season_id, 3, 'Refleksi Diri & Nilai Kehidupan',   'https://iframe.mediadelivery.net/embed/demo/kelas-3'),
    (v_season_id, 4, 'Studi Kasus dalam Keseharian',      'https://iframe.mediadelivery.net/embed/demo/kelas-4'),
    (v_season_id, 5, 'Menemukan Hikmah yang Tersembunyi', 'https://iframe.mediadelivery.net/embed/demo/kelas-5'),
    (v_season_id, 6, 'Rangkuman & Penguatan Komitmen',    'https://iframe.mediadelivery.net/embed/demo/kelas-6');

  -- Bank soal hanya untuk kelas 1 (6 soal ≥ 5 tampil). Kelas lain sengaja kosong
  -- supaya status "belum_tersedia" ikut teruji.
  select id into v_kelas1_id from public.kelas where season_id = v_season_id and nomor = 1;
  insert into public.soal (kelas_id, pertanyaan, pilihan, kunci)
  select v_kelas1_id, 'Soal contoh nomor ' || n, '["A", "B", "C", "D"]'::jsonb, (n % 4)::smallint
  from generate_series(1, 6) as n;

  -- Sesi offline pembuka milik kloter 1.
  update public.event_sessions
  set kloter_id = v_kloter_id
  where nama_sesi like 'Sesi 1%';
end $$;
