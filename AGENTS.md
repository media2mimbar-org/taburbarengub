<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> Terakhir diperbarui: **2026-09-26** (branch aktif: `rombak/backend`). File ini dibaca semua agen AI; `CLAUDE.md` hanya mengimpornya.

# Dokumentasi proyek

Mulai dari halaman Notion **TaburBarengUB** (https://app.notion.com/p/3c0ab951619c81ec95bde214e3f491e4): bagian *Protokol AI* di sana memuat urutan baca, sumber kebenaran, konvensi, dan cara menutup sesi. Fakta teknis ada di repo ini: `supabase/migrations/*_baseline.sql`, lalu `docs/BACKEND.md` (rincian desain) dan `docs/ARCHITECTURE.md` (ringkasan pola).

- Kode berawalan `RB-` (RB-H5, RB-D4, …) = temuan review backend di `docs/arsip/REVIEW_BACKEND_TEMUAN.md`. Kode tanpa awalan (D10, D16, H5, G8, …) = Pertanyaan Terbuka / Keputusan Internal di Notion.
- Tulis kode bersama nama pendeknya: "RB-H5 (counter kuota)", bukan "RB-H5" saja.

# Commands
- `npm test` - Run unit test suite via Node test runner & tsx (`tsx --test src/**/*.test.ts`)
- `npm run typecheck` - Run TypeScript compiler check (`tsc --noEmit`)
- `npm run lint` - Run ESLint check
- `npm run build` - Production Next.js Turbopack build
- `npm run db:types` - Regenerate TypeScript types from local Supabase instance
- `npx supabase db reset` - Reset local database, apply the baseline migration & seed
- `npx supabase test db` - Run pgTAP behaviour tests in `supabase/tests/` (gates, quiz, submissions, registration)
- `npx supabase db advisors --local` / `npx supabase db lint --local` - Must be 0 issues
- **Do NOT run `npm run db:push` or `npm run db:types:linked`** until the cloud deploy (`docs/BACKEND.md` §4.5): cloud still runs the Fase 1 schema.

# Architecture & Security Patterns
- **Gates live in the database.** Every "allowed or not" (watch video, submit, quiz, grade, see links) is answered by Postgres. TypeScript reads the answer (`get_video_url`, `get_status_kuis`, …) and never recomputes it.
- **Write-path rule**: rules checkable per row → admin writes tables directly (RLS + CHECK + column grants). Rules spanning rows/tables → `SECURITY DEFINER` RPC with `FOR UPDATE` where races exist. Status columns (`kloters.status/tanggal_selesai`, `seasons.terbit/tanggal_selesai`) change only via `ubah_status_kloter` / `ubah_status_season`.
- **Invariant vs policy**: invariants → constraints. Business policies used in >1 place → one plug-in function in `app_internal` (`boleh_menilai_naskah`, `status_jendela_kuis`, `hitung_nilai_kuis`). Change the body, not the callers.
- **RPC zones**:
  - Zone A (participant): `create_booking`, `update_profile`, `setor_karya`, `get_video_url`, `get_soal_kelas`, `jawab_kuis`, `get_status_kuis`, `get_season_peristiwa`.
  - Zone B (admin/mentor/staff, role checked inside): `nilai_karya`, `check_in_booking`, `ubah_status_season`, `ubah_status_kloter`, `daftarkan_peserta`, `koreksi_kunci`.
  - Zone C (`app_internal`, hidden from PostgREST): role helpers, plug-ins, triggers.
- **Kloter timeline**: five boundaries b1–b5 on `kloters` → four derived phases (`pendaftaran`, `orientasi`, `menyimak`, `menulis_setor`). Status `draft | berjalan | wrapped`. View `kloter_dalam_fase`; GiST anti-overlap on `[b1, b5)` excluding drafts. Season lifecycle derived via computed field `status_siklus`.
- **Gate shapes**: video = threshold (from b3 of the user's origin kloter; archive owners immediately). Submission = window `[b4, b5)`. Quiz = window of the origin kloter (currently `[b3, b4)`), one attempt, scored in DB.
- **Ownership**: `user_seasons.jenis` `bimbingan | arsip`; archive = no kloter, video + recordings only.
- **Binding scripts**: latest version in the origin kloter, defined once in view `naskah_mengikat`.
- **Secret columns**: `kelas.video_url`, `kloters.livestream_url`, `event_sessions.rekaman_url`, whole `soal` table — not selectable by clients; served via gated RPCs. Never `select('*')` on these tables; use explicit column lists (e.g. `SESSION_COLUMNS`).
- **Errors**: match RPC `hint` (e.g. `KUIS_SUDAH_DIJAWAB`), never message text.
- **Progressive Profiling**: no `profile_completed`; `users.tanggal_lahir`, `users.jenis_kelamin ('ikhwan'|'akhwat')`, WhatsApp normalized to `628...`.
- **Snapshots (G9, nama di sertifikat)**: `certificates.nama_penerima` frozen at issuance; raport values will be copied, not referenced.
- **Files (D16, karya = file Word/PDF)**: private bucket `karya-tulis`, path `{user_id}/…`; upload to own folder only, no overwrite/delete.
