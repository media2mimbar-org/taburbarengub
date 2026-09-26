# TaburBarengUB

Platform event TaburBarengUB Fase 1: landing page event, autentikasi, booking seat sesi offline, tiket QR, check-in QR, dan dashboard admin dasar.

## Requirements

- Node.js 22.x
- npm
- Supabase project yang sudah menjalankan migration di `supabase/migrations`

Versi Node dipin melalui:

```bash
.nvmrc
```

Jika memakai `nvm`:

```bash
nvm use
```

## Environment

Salin template env:

```bash
cp .env.example .env.local
```

Isi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Jangan pernah menaruh `sb_secret_*` atau service-role key di variable `NEXT_PUBLIC_*`.

## Install

```bash
npm ci
```

## Development

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx supabase test db   # tes perilaku DB (pgTAP), butuh Supabase lokal
```

CI (Node 22) menjalankan semuanya, dengan Supabase lokal menyala.

## Supabase workflow

Skema ada di satu file baseline:

```text
supabase/migrations/20260925000000_baseline.sql
supabase/tests/         # tes pgTAP
supabase/seed.sql       # data contoh lokal
```

Kerja lokal (butuh Docker):

```bash
npx supabase start
npx supabase db reset   # terapkan baseline + seed
npm run db:types
npx supabase test db
```

Cloud (`db:push`, `db:types:linked`) **jangan dipakai dulu**: cloud masih berskema Fase 1, dan baseline tidak bisa di-push di atasnya. Deploy butuh ekspor–reset–impor akun; lihat `docs/BACKEND.md` §4.5.

Desain dan keputusan backend: `docs/BACKEND.md`. Pola arsitektur: `docs/ARCHITECTURE.md`.

## Main routes

Public/auth:

```text
/
/login
/register
/forgot-password
/reset-password
/sesi/[id]
```

Member:

```text
/app
/tiket-saya
/tiket-saya/[id]
```

Admin:

```text
/admin
/admin/hero
/admin/sesi
/admin/sesi/[id]
/admin/sesi/new
/admin/sesi/[id]/edit
/admin/peserta
/admin/scanner
/admin/karya
```

API:

```text
POST /api/bookings
POST /api/check-in
PATCH /api/me/profile
GET  /api/classroom/kuis?kelas_id=...
POST /api/classroom/kuis
POST /api/submissions
POST /api/admin/sessions
PATCH /api/admin/sessions/[id]
PATCH /api/admin/hero
POST /api/admin/submissions/grade
GET /admin/peserta/export.csv?session_id=...
```

## Documentation

- `docs/BACKEND.md` — desain backend season/kloter: keputusan, gerbang, yang masih terbuka.
- `docs/ARCHITECTURE.md` — ringkasan pola layering dan tempat logika.
- `docs/ROADMAP.md` — status fase dan milestone frontend.
- `docs/SMOKE_TEST.md` — checklist smoke test manual.
- `docs/REVIEW_ACTION_TRACKER.md` — tracker action item hasil review.
- `docs/arsip/` — dokumen historis: `AUDIT_HANDOFF.md` (audit Juli–Agustus) dan `REVIEW_BACKEND_TEMUAN.md` (temuan review backend, kode `RB-`).
- Notion **TaburBarengUB** — keputusan, status, spesifikasi halaman, dan serah-terima antar-AI. Lihat `AGENTS.md`.

## Deployment notes

- Pastikan runtime deployment memakai Node 22.
- Set env production di platform deploy.
- Pastikan Supabase Auth redirect URL mengarah ke domain deploy.
- Jalankan smoke test setelah deploy dan migration.
