@AGENTS.md

> Terakhir diperbarui: **2026-09-25** (Branch aktif: `rombak/backend`). Rincian desain: `docs/BACKEND.md`; ringkasan pola: `docs/ARCHITECTURE.md`.

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
- **Secret columns**: `kelas.video_url`, `kloters.livestream_url`, `event_sessions.rekaman_url`, whole `soal` table — not selectable by clients; served via gated RPCs.
- **Errors**: match RPC `hint` (e.g. `KUIS_SUDAH_DIJAWAB`), never message text.
- **Progressive Profiling**: no `profile_completed`; `users.tanggal_lahir`, `users.jenis_kelamin ('ikhwan'|'akhwat')`, WhatsApp normalized to `628...`.
- **Snapshots (G9)**: `certificates.nama_penerima` frozen at issuance; raport values will be copied, not referenced.
- **Files (D16)**: private bucket `karya-tulis`, path `{user_id}/…`; upload to own folder only, no overwrite/delete.

# Documentation Rules
- **Content Inventory Rule**: Never write Content Inventory status without explicitly naming unfinished pages: always `"10 tuntas, 4 admin belum"` (`/admin/season`, `/admin/kloter/[id]`, `/admin/karya`, `/admin/pembayaran`).
- **Reversed Decisions**: Never delete the "Keputusan yang pernah dibalik" table in Notion; move superseded decisions there with rationale.
