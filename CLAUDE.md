@AGENTS.md

> Terakhir diperbarui: **2026-08-30** (Branch aktif: `rombak/backend`)

# Commands
- `npm test` - Run unit test suite via Node test runner & tsx (`tsx --test src/**/*.test.ts`)
- `npm run typecheck` - Run TypeScript compiler check (`tsc --noEmit`)
- `npm run lint` - Run ESLint check
- `npm run build` - Production Next.js Turbopack build
- `npm run db:types` - Regenerate TypeScript types from local Supabase instance
- `npx supabase db reset` - Reset local database and reapply all migrations & seed
- `npx supabase db advisors --local` - Run Supabase performance & security linter (must be 0 issues)

# Architecture & Security Patterns
- **3-Zone Security**:
  - Zone A (Public RPCs): `create_booking`, `update_profile`, `setor_karya`, `get_video_url` (`SECURITY DEFINER`, `auth.uid()`, exposed to `authenticated`).
  - Zone B (Admin RPCs): `nilai_karya`, `check_in_booking` (gated via `requireAdmin(supabase)` on Next.js server route handlers).
  - Zone C (Internal): `app_internal.is_admin()`, `app_internal.guard_tanggal_sesi()`, `app_internal.handle_new_user()` (hidden schema, invisible to PostgREST).
- **Single Gate of Write**: Critical mutations enforced in PostgreSQL RPCs (`SECURITY DEFINER`, `FOR UPDATE` locks), direct table writes closed via RLS.
- **Single Global Clock**: Maximum 1 active kloter platform-wide (`btree_gist` anti-overlap). Phase calculated dynamically from `now()` via view `kloter_aktif`.
- **Video URL Protection**: Direct SELECT on `kelas.video_url` is revoked; retrieved via RPC `get_video_url(p_kelas_id)` checking season ownership & `menyimak` phase.
- **Progressive Profiling**: No monolithic `profile_completed`. `users.tanggal_lahir date` (replaces static age), `users.jenis_kelamin ('ikhwan'|'akhwat')`, auto-normalized WhatsApp `628...`.
- **Certificate Snapshot**: `certificates.nama_penerima text NOT NULL` (freezes legal recipient name at issuance time, G9).
- **File Upload Semantics (D16)**: Assignments uploaded as physical files (`.docx`/`.pdf`) to private Supabase Storage bucket `karya-tulis`, saving storage path in `writing_submissions.file_url`.

# Documentation Rules
- **Content Inventory Rule**: Never write Content Inventory status without explicitly naming unfinished pages: always `"10 tuntas, 4 admin belum"` (`/admin/season`, `/admin/kloter/[id]`, `/admin/karya`, `/admin/pembayaran`).
- **Reversed Decisions**: Never delete the "Keputusan yang pernah dibalik" table in Notion; move superseded decisions there with rationale.
