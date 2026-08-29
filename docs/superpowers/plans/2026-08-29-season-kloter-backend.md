# Season & Kloter Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete database migration, TypeScript types, and server service layer for the Season & Kloter domain architecture based on `tabur-schema.sql` and the Notion contract (`3caab951-619c-816c-9af3-fc4ac33d6b3b`).

**Architecture:** Vertical-slice feature-based architecture (`src/features/{season,classroom,submission}/{server,shared,client}`) on Next.js 16 App Router + Supabase PostgreSQL 17. Database invariants (single global clock, computed phase, threshold vs window gating, no-overlap constraints, serialization via `FOR UPDATE` in `SECURITY DEFINER` RPC) enforce business rules at the database level, wrapped by type-safe service functions in Next.js.

**Tech Stack:** Next.js 16 (React 19), Supabase PostgreSQL 17, TypeScript 5, Zod 4, `@supabase/ssr`.

**Spec:** `~/Dokumen/tabur-schema.sql` & Notion page `3caab951-619c-816c-9af3-fc4ac33d6b3b` (*Schema Season/Kloter — kontrak & keputusan (26 Agt)*).

## Global Constraints

- PostgreSQL 17 target with `btree_gist` extension for exclusion constraints.
- All phase calculations for state-changing actions MUST evaluate `now()` inside PostgreSQL (`kloter_aktif` view / RPC), never trusting client clocks.
- Single global clock: exactly one or zero active kloters across the platform.
- Gating semantics: Video access is a **Threshold** (`opens_at` of `menyimak` passed, then open forever); writing submission is a **Window** (`kloter_aktif.fase = 'menulis_setor'`).
- Business logic MUST live in `src/features/*/server/*-service.ts`, never in route handlers or client components.
- No `service_role` key in client; authentication must use `auth.uid()` inside Postgres RPC and `@supabase/ssr` server client.

---

### Task 1: Supabase Migration File for Season & Kloter Core

**Files:**
- Create: `supabase/migrations/20260829000000_season_kloter_core.sql`

**Interfaces:**
- Produces:
  - Tables: `seasons`, `kloters`, `kloter_phases`, `kelas`, `user_seasons`, `video_progress`, `writing_submissions`, `certificates`
  - Columns: `event_sessions.kloter_id`
  - Enum: `phase_type` ('offline','pendaftaran','orientasi','menyimak','menulis_setor','wrapped','antara_kloter')
  - View: `kloter_aktif` (security_invoker = true)
  - Function: `setor_karya(p_file_url text) RETURNS writing_submissions`
  - RLS Policies on all 8 tables and `GRANT EXECUTE ON FUNCTION setor_karya`

- [ ] **Step 1: Write the migration SQL file**

Write `supabase/migrations/20260829000000_season_kloter_core.sql` containing:
- `CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;`
- `CREATE TYPE public.phase_type AS ENUM (...)`
- System-owned tables (`seasons`, `kloters` with `tstzrange` exclusion constraint, `kloter_phases` with exclusion and partial unique index on `override_active`, `kelas`)
- `ALTER TABLE public.event_sessions ADD COLUMN kloter_id uuid REFERENCES public.kloters(id);`
- User-owned tables (`user_seasons`, `video_progress`, `writing_submissions`, `certificates`)
- View `public.kloter_aktif` with `(security_invoker = true)`
- Function `public.setor_karya(p_file_url text)` with `SECURITY DEFINER SET search_path = public` and `FOR UPDATE` lock on `user_seasons`
- RLS enabled on all 8 new tables + `SELECT` policies for public/own
- `GRANT EXECUTE ON FUNCTION public.setor_karya(text) TO authenticated;`

- [ ] **Step 2: Verify SQL syntax and completeness**

Check that every constraint name, table definition, and RPC function matches the locked contract in `tabur-schema.sql` and Notion.

- [ ] **Step 3: Commit migration**

```bash
git add supabase/migrations/20260829000000_season_kloter_core.sql
git commit -m "feat(db): add season and kloter core schema migration"
```

---

### Task 2: Update Database Types & Shared Season Types

**Files:**
- Modify: `src/lib/types/database.types.ts`
- Create: `src/features/season/shared/season.types.ts`
- Create: `src/features/season/shared/season-rules.ts`
- Test: `src/features/season/shared/season-rules.test.ts`

**Interfaces:**
- Produces:
  - `Database` definitions for tables: `seasons`, `kloters`, `kloter_phases`, `kelas`, `user_seasons`, `video_progress`, `writing_submissions`, `certificates`
  - `Database` definition for view `kloter_aktif` and function `setor_karya`
  - `PhaseType`, `SeasonStatus`, `KloterAktifRow`, `SeasonOverview`
  - Pure helper functions in `season-rules.ts`:
    - `canAccessVideo({ ownsSeason: boolean, menyimakOpensAt: string | null, now?: Date }): boolean`
    - `isSubmissionWindowOpen(activePhase: PhaseType | null): boolean`
    - `getPhaseLabel(phase: PhaseType): string`

- [ ] **Step 1: Write the failing unit test for season gating rules**

Write `src/features/season/shared/season-rules.test.ts` testing threshold gating for video access and window gating for submissions.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/season/shared/season-rules.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Update `src/lib/types/database.types.ts` with new tables, views, enums, and RPC**

Add all new schema types into `database.types.ts` matching Supabase generated interface format.

- [ ] **Step 4: Implement `season.types.ts` and `season-rules.ts`**

Write domain interfaces and pure helper functions enforcing threshold vs window logic.

- [ ] **Step 5: Run tests and typecheck**

Run: `node --test src/features/season/shared/season-rules.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/database.types.ts src/features/season/shared/
git commit -m "feat(season): add database types and season shared rules"
```

---

### Task 3: Season & Kloter Server Service Layer

**Files:**
- Create: `src/features/season/server/season-service.ts`
- Test: `src/features/season/server/season-service.test.ts`

**Interfaces:**
- Produces:
  - `getActiveKloter(supabase: SupabaseClient<Database>): Promise<KloterAktif | null>`
  - `getSeasonDetails(supabase: SupabaseClient<Database>, seasonId: string): Promise<SeasonDetails | null>`
  - `getUserSeasonOwnership(supabase: SupabaseClient<Database>, userId: string, seasonId: string): Promise<UserSeasonOwnership | null>`
  - `getPublicCalendar(supabase: SupabaseClient<Database>): Promise<PublicCalendar>`

- [ ] **Step 1: Write unit tests for season service mapping and data queries**

Write `src/features/season/server/season-service.test.ts` with mock Supabase client testing `getActiveKloter`, `getSeasonDetails`, and `getUserSeasonOwnership`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/season/server/season-service.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/features/season/server/season-service.ts`**

Implement fail-closed query for `kloter_aktif`, season schedule retrieval, and user ownership check.

- [ ] **Step 4: Run tests and typecheck**

Run: `node --test src/features/season/server/season-service.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/season/server/season-service.ts src/features/season/server/season-service.test.ts
git commit -m "feat(season): implement season and kloter service layer"
```

---

### Task 4: Classroom & Video Progress Service Layer

**Files:**
- Create: `src/features/classroom/shared/classroom.schema.ts`
- Create: `src/features/classroom/shared/classroom.types.ts`
- Create: `src/features/classroom/server/classroom-service.ts`
- Test: `src/features/classroom/server/classroom-service.test.ts`

**Interfaces:**
- Produces:
  - Zod schema `quizSubmissionSchema`: validates answers array, quiz question IDs, and selected choices.
  - `getClassListWithProgress(supabase, userId, seasonId)`: Returns 6 classes with gated `video_url` (unlocked only if user passes threshold) and `ditonton` / `skor` status.
  - `submitQuizProgress(supabase, userId, kelasId, payload)`: Validates quiz, computes score, and upserts `video_progress` record (`ditonton = true`, `jawaban_soal`, `skor`).

- [ ] **Step 1: Write failing tests for quiz schema validation and video access threshold**

Write `src/features/classroom/server/classroom-service.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/classroom/server/classroom-service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `classroom.schema.ts` and `classroom-service.ts`**

Implement the threshold-gated video fetch and quiz submission scoring/upsert logic.

- [ ] **Step 4: Run tests and typecheck**

Run: `node --test src/features/classroom/server/classroom-service.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/classroom/
git commit -m "feat(classroom): implement classroom and video progress service layer"
```

---

### Task 5: Writing Submission & Grading Service Layer

**Files:**
- Create: `src/features/submission/shared/submission.schema.ts`
- Create: `src/features/submission/shared/submission.types.ts`
- Create: `src/features/submission/server/submission-service.ts`
- Test: `src/features/submission/server/submission-service.test.ts`

**Interfaces:**
- Produces:
  - Zod schemas: `submitWritingSchema` (URL, MIME docx/pdf validation), `gradeSubmissionSchema` (mentor grading: rubrik konten A/B/C, bahasa A/B/C, feedback, rekomendasi).
  - `submitWriting(supabase, fileUrl)`: Wraps RPC `setor_karya(p_file_url)` with error code mapping.
  - `getUserSubmissions(supabase, userId, kloterId)`: Returns submission history with version numbers and status pipeline.
  - `gradeSubmission(supabase, submissionId, mentorUserId, gradePayload)`: Updates submission with mentor review (for admin/mentor).

- [ ] **Step 1: Write failing tests for submission schema validation and RPC error mapping**

Write `src/features/submission/server/submission-service.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/submission/server/submission-service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `submission.schema.ts` and `submission-service.ts`**

Implement RPC wrapper, error mapping (window closed, not enrolled, unauthenticated), and submission history query.

- [ ] **Step 4: Run tests and typecheck**

Run: `node --test src/features/submission/server/submission-service.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/submission/
git commit -m "feat(submission): implement writing submission service and schema"
```

---

### Task 6: API Route Handlers & Integration Verification

**Files:**
- Create: `src/app/api/classroom/progress/route.ts`
- Create: `src/app/api/submissions/route.ts`
- Test: Full project build & typecheck

**Interfaces:**
- Produces:
  - `POST /api/classroom/progress`: Authenticated route handler calling `submitQuizProgress`.
  - `POST /api/submissions`: Authenticated route handler calling `submitWriting`.

- [ ] **Step 1: Implement API route handlers**

Write `src/app/api/classroom/progress/route.ts` and `src/app/api/submissions/route.ts` as thin wrappers parsing JSON, validating with Zod, and delegating to services.

- [ ] **Step 2: Run all tests, linter, typecheck, and build**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: All checks PASS with zero errors.

- [ ] **Step 3: Commit and push**

```bash
git add src/app/api/
git commit -m "feat(api): add classroom progress and submission api route handlers"
git push origin rombak/backend
```
