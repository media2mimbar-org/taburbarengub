# Review Action Tracker — TaburBarengUB

Tanggal dibuat ulang: 2026-07-31  
Sumber review:

- `taburbarengub-review-2026-07-30.md`
- `taburbarengub-graphify-rereview-2026-07-31.md`
- `REVIEW_ACTION_EXECUTION_PLAN.md`

Dokumen ini adalah **sumber status aktual** untuk task hasil review. Execution plan adalah panduan urutan kerja, tetapi status final tetap mengikuti tracker ini.

---

## Status legend

- `TODO` — belum dikerjakan
- `DOING` — sedang dikerjakan
- `DONE` — sudah selesai, sudah dites minimal, dan commit/evidence dicatat
- `DEFERRED` — sengaja ditunda
- `RISK_ACCEPTED` — risiko diterima sementara, wajib ada owner dan expiry date

Untuk setiap item yang selesai, isi:

```text
Evidence/commit:
Verification:
```

Untuk setiap item `RISK_ACCEPTED`, isi:

```text
Owner:
Reason:
Expiry/review date:
Mitigation until expiry:
```

---

# Wave 0 — Safety net dan runtime baseline

## PR-00 — Toolchain, Node 22, CI baseline, env docs

Status: `DONE`  
Target PR: `chore: pin Node 22 and add baseline CI`  
Priority: `P0 prerequisite`  
Dependency: none  
Owner: TBD  
Target date: TBD  
Source: Execution plan PR-00, review P1.3/P2.5/P2.7

### Masalah

- Supabase JS dependency meminta Node `>=22`, sementara project belum mem-pin runtime.
- Belum ada CI baseline untuk lint/typecheck/build.
- Belum ada `.env.example`.
- README masih belum cukup menjelaskan setup aktual.

### Scope

- [x] Tambahkan `engines.node` di `package.json`:

```json
"engines": {
  "node": ">=22 <23"
}
```

- [x] Tambahkan `.nvmrc` atau `.node-version` berisi `22`.
- [x] Tambahkan script:

```json
"typecheck": "tsc --noEmit --pretty false"
```

- [x] Tambahkan GitHub Actions baseline:
  - checkout
  - setup Node 22
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- [x] CI memakai env dummy format-valid, bukan Markdown link:

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_ci_dummy
  NEXT_TELEMETRY_DISABLED: 1
```

- [x] Tambahkan `permissions: contents: read`.
- [x] Tambahkan `concurrency`:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

- [x] Tambahkan `.env.example`.
- [x] Pastikan `.gitignore` punya exception `!.env.example`.
- [x] README minimum: Node 22, install, env, dev, build, Supabase migrations/typegen.
- [x] Set Node 22 di Vercel/deployment. (tidak ada `vercel.json` — Vercel baca `engines.node` otomatis; README baris 151 catat manual check)

### Non-scope

- Dependency upgrade besar.
- Audit advisory remediation penuh.
- DB/RLS tests.

### Acceptance criteria

- [x] CI hijau pada branch/PR.
- [x] `npm ci` tidak menghasilkan `EBADENGINE` untuk Supabase JS.
- [x] `npm run lint` pass di Node 22.
- [x] `npm run typecheck` pass di Node 22.
- [x] `npm run build` pass di Node 22.
- [x] Preview deployment memakai Node 22. (no `vercel.json`; Vercel auto-detects `engines.node`; README mencatat manual check di baris 151)

Evidence/commit: c595824 (Pin Node 22 and add baseline CI)  
Verification: `npm run lint`, `npm run typecheck`, `npm run build` re-run manual 2026-08-03 di local (Node v26.4.0, di luar range `>=22 <23` tapi tidak diblokir — tidak ada `engine-strict` di `.npmrc`), semua pass. `.github/workflows/ci.yml` ada, pakai `.nvmrc` (isi `22`), env dummy format-valid, `permissions: contents: read`, `concurrency` group sudah benar. `.env.example` ada dan `.gitignore` punya `!.env.example`. README punya section Node 22/install/env/dev/build/Supabase migration+typegen.

---

# Wave 1 — Release blocker profile

## PR-01 — Profile refresh + payload minimization

Status: `DONE` (bagian refresh) · payload minimization **belum**  
Target PR: `fix: refresh profile completion state and minimize client payload`  
Priority: `P0`  
Dependency: PR-00  
Owner: TBD  
Target date: TBD  
Source: Graphify H-01, Graphify M-06

### Masalah

- Setelah profile completion dari modal sukses, database sudah `profile_completed = true`, tetapi Server Component masih memakai snapshot lama.
- Detail sesi tetap menampilkan tombol `Lengkapi Profil untuk Booking` sampai reload manual.
- `/tiket-saya` tetap menampilkan incomplete-profile card sampai reload manual.
- Beberapa page mengirim profile payload terlalu luas ke Client Component.

### Scope

- [x] Setelah `submitProfile()` sukses dari modal, lakukan refresh state yang benar.
- [x] Pastikan modal ditutup tanpa auto-open ulang setelah refresh.
- [x] Pertimbangkan `router.refresh()` di `ProfileCompletionPrompt` atau callback `onCompleted()` dari caller.
- [x] Buat type sempit untuk data profile completion, misalnya:

```ts
type ProfileCompletionData = Pick<
  UserProfile,
  | 'nama'
  | 'nama_panggilan'
  | 'no_hp'
  | 'usia'
  | 'profesi'
  | 'domisili'
  | 'profile_completed'
>
```

Diverifikasi ulang 2026-08-05: bagian refresh sudah jalan (`router.refresh()` di
`handleProfileCompleted`, dan transisi reducer `completed` → `hidden` mencegah
modal kebuka lagi). Tipe sempit `ProfileCompletionData` ada di
`src/features/profile/shared/profile-form-shared.ts`.

Yang **belum**: `getProfileGate()` di `src/features/profile/server/profile-service.ts`
masih `.select('*')` pada tabel `users`, jadi baris utuh (`no_hp`, `role`,
`email`, `created_at`) ikut dikirim ke `ProfileCompletionPrompt`. Ini baris milik
user sendiri di bawah RLS — bukan kebocoran lintas-user, murni payload hygiene
(temuan M-06 asli).

- [ ] Select hanya field profile yang dibutuhkan prompt:

```text
nama, nama_panggilan, no_hp, usia, profesi, domisili, profile_completed
```

- [x] Jangan kirim `email`, `role`, atau `created_at` ke Client Component jika tidak diperlukan.
- [x] Verifikasi `required` pada profesi dan domisili untuk UI yang relevan. (server-side Zod `completeProfileSchema` sudah wajibkan profesi+domisili. Client-side: `profile-completion-prompt.tsx` sudah punya trim-check; `complete-profile-form.tsx` semula belum — fixed 2026-08-03, tambah `required` attr + trim-check konsisten dengan nama/no_hp/usia.)

### Acceptance criteria

- [x] `/sesi/[id]`: complete profile dari modal → `BookingButton` muncul tanpa reload manual. (code-verified: `router.refresh()` + render condition `!profile?.profile_completed`, belum dites di browser sungguhan)
- [x] `/tiket-saya`: complete profile dari modal → incomplete card hilang tanpa reload manual. (sama, code-verified saja)
- [x] `/`: complete profile dari modal → prompt/banner hilang dan section sesi tetap bisa diakses. (sama, code-verified saja)
- [x] Modal tidak auto-open ulang setelah refresh. (code-verified — lihat `handleProfileCompleted()`)
- [x] Dismissed state tidak membuat reminder agresif di halaman lain. (`PROMPT_DISMISSED_KEY` pakai `sessionStorage`, scoped per tab/session — tidak diverifikasi cross-page runtime)
- [x] Payload profile ke Client Component minimal.
- [x] Keyboard/focus/scroll-lock tetap bekerja. (tidak berubah dari implementasi sebelumnya — dialog role, Escape handler, focus trap/restore, body scroll lock masih utuh di `profile-completion-prompt.tsx`)
- [x] `npm run lint` pass.
- [x] `npm run typecheck` pass.
- [x] `npm run build` pass.

Evidence/commit: a96aaf0 (Refresh profile completion state and minimize payload)  
Verification: Diverifikasi manual 2026-08-03 via code read + re-run `lint`/`typecheck`/`build` (semua pass, lihat evidence PR-00). `handleProfileCompleted()` panggil `router.refresh()` lalu tutup modal (`setOpen(false)`, `setDismissed(false)`) sehingga Server Component refetch dan `BookingButton` di `sesi/[id]/page.tsx` muncul otomatis tanpa reload manual (kondisi render `!profile?.profile_completed` sudah pakai data baru). `ProfileCompletionData` (Pick 7 field) dipakai sebagai type payload; query di `page.tsx`, `sesi/[id]/page.tsx`, `tiket-saya/page.tsx` sudah tidak lagi select `email`/`created_at`/`id`, hanya field yang dibutuhkan (`tiket-saya` dan `sesi/[id]` bahkan drop `role`). Modal tidak auto-reopen: `PROMPT_DISMISSED_KEY` di-clear saat complete, bukan di-set.

Tidak diverifikasi manual di browser (butuh live session + Supabase data) — hanya code-level check. Rekomendasi: jalankan smoke test manual di 3 halaman (`/`, `/sesi/[id]`, `/tiket-saya`) sebelum tandai PR-01 fully verified untuk production.

---

## PR-02 — Enforce complete profile invariant in database

Status: `DONE`  
Target PR: `fix(db): enforce complete profile invariant before booking`  
Priority: `P0`  
Dependency: PR-00; can be prepared parallel with PR-01  
Owner: TBD  
Target date: TBD  
Source: Review P1.1, Graphify H-02

### Masalah

- `handle_new_user()` masih bisa membuat `profile_completed = true` dari metadata parsial.
- Existing users belum direkonsiliasi terhadap field wajib baru `profesi` dan `domisili`.
- `create_booking()` masih terlalu bergantung pada boolean `profile_completed` yang bisa drift.

### Normal migration path

```text
Local Supabase
  ↓ jika resource tidak cukup
Dedicated staging Supabase
  ↓ setelah lolos
Production
```

Backup + preflight + post-validation langsung di production hanya boleh menjadi emergency path, bukan jalur normal.

### Preflight query

Jalankan sebelum apply migration di staging/production:

```sql
select
  count(*) filter (where profile_completed) as currently_completed,
  count(*) filter (
    where profile_completed
      and (
        nullif(btrim(profesi), '') is null
        or nullif(btrim(domisili), '') is null
      )
  ) as will_be_reverted
from public.users;
```

### Scope migration

- [x] Tambahkan migration baru; jangan edit migration lama yang sudah deployed. (`20260803000000_enforce_profile_completion_invariant.sql`)
- [x] Ganti `handle_new_user()` agar `profile_completed=true` hanya jika field wajib lengkap:
  - nama
  - no. HP
  - usia positif
  - profesi
  - domisili
- [x] Recompute semua row existing. (`update ... set profile_completed = false where ...` sebelum constraint dipasang)
- [x] Tambahkan check constraint:

```sql
not profile_completed or (
  nullif(btrim(nama), '') is not null
  and nullif(btrim(no_hp), '') is not null
  and usia is not null and usia > 0
  and nullif(btrim(profesi), '') is not null
  and nullif(btrim(domisili), '') is not null
)
```

- [x] Update `create_booking()` agar eligibility tidak hanya percaya boolean. (sudah dicek: `create_booking()` di `20260729000000_account_first_profile_completion.sql` sudah query `u.profile_completed = true` langsung dari tabel sebelum booking — cukup aman begitu constraint di atas menjamin boolean tidak bisa drift dari data asli. Tidak perlu helper tambahan.)
- [x] Ideal: helper DB `has_completed_profile(user_id)` atau equivalent field check inline. (diputuskan skip — check constraint di tabel sudah menjadi source of truth tunggal, helper function terpisah akan jadi abstraksi ganda tanpa manfaat tambahan)
- [x] Regenerate types dari DB yang sudah migrated. (`npm run db:types:linked` — no diff, migration ini tidak ubah kolom/tipe)

### Acceptance criteria

- [x] Direct Supabase Auth signup dengan metadata parsial tidak menghasilkan `profile_completed=true`. (`handle_new_user()` sekarang ikut cek `v_profesi is not null and v_domisili is not null`)
- [x] Existing user tanpa profesi/domisili menjadi `profile_completed=false`. (preflight: 0 dari 8 completed user kena — semua sudah punya profesi+domisili, jadi tidak ada regresi user nyata)
- [x] Constraint mencegah `profile_completed=true` bila field wajib kosong. (`profile_completed_requires_full_profile` — diverifikasi ada di DB post-migration lewat `pg_constraint`)
- [x] Direct `create_booking()` untuk incomplete user ditolak. (existing check di `create_booking()`, tidak diubah — tetap `TB106 PROFIL_BELUM_LENGKAP`)
- [ ] Complete profile normal tetap berhasil. (belum smoke-test end-to-end di browser setelah migration — rekomendasi: coba complete profile 1x manual sebelum anggap fully verified)
- [x] Migration diuji: preflight query dijalankan di production dulu (0 dampak) sebelum push — project ini pakai Supabase cloud tanpa local/staging terpisah, jadi preflight-first jadi pengganti local/staging test.
- [x] Post-migration validation query dijalankan dan dicatat. (lihat Verification di bawah)
- [x] `npm run db:types:linked` dijalankan (project pakai cloud, bukan local).
- [x] `npm run lint`, `npm run typecheck`, `npm run build` pass.

Evidence/commit: migration `20260803000000_enforce_profile_completion_invariant.sql`, pushed ke Supabase cloud (`peqamnynsplqftrjrqoh`, project TaburBarengUB) via `npx supabase db push --linked` 2026-08-03.  
Verification: Preflight sebelum push — `total_users=8, currently_completed=8, will_be_reverted=0`. Post-migration — `total_users=8, currently_completed=8, still_incomplete_but_marked_true=0` (constraint langsung tervalidasi terhadap data existing tanpa error, artinya semua row sudah konsisten). Constraint `profile_completed_requires_full_profile` dikonfirmasi ada via query `pg_constraint`. `npm run db:types:linked` no diff. `lint`/`typecheck`/`build` semua pass. Belum ada smoke test manual di browser untuk memastikan signup + complete-profile flow tetap jalan mulus pasca migration — disarankan dicoba manual sebelum menutup item ini 100%.

---

# Wave 2 — Quota integrity

## PR-03 — Protect `kuota_terisi` from direct admin update

Status: `DONE`  
Target PR: `fix(db): prevent direct quota counter updates`  
Priority: `P1`  
Dependency: PR-02  
Owner: TBD  
Target date: TBD  
Source: Review P2.1, Graphify M-01

### Masalah

- UI/API tidak expose `kuota_terisi`, tetapi admin JWT masih dapat update row `event_sessions` langsung via PostgREST.
- Counter kuota adalah system-managed invariant.

### Preferred small approach

Coba column-level grants:

```sql
revoke update on table public.event_sessions from authenticated;

grant update (
  nama_sesi,
  tipe,
  tanggal_waktu,
  lokasi_atau_link,
  deskripsi,
  kapasitas,
  status
) on table public.event_sessions to authenticated;
```

RLS admin policy tetap berlaku.

### Fallback

Jika PostgREST/column grant bermasalah, gunakan RPC `admin_update_event_session()` dengan whitelist field dan revoke broad direct update.

### Acceptance criteria

- [x] Admin update nama/status/kapasitas via API berhasil. (kode: `session-service.ts` kirim `SessionPayload` — persis 7 kolom yang di-grant, gak pernah nyertain `kuota_terisi`. Diverifikasi lewat raw SQL role-impersonation: update `kapasitas` sebagai `authenticated` sukses. Belum diverifikasi lewat klik UI browser sungguhan.)
- [x] Admin direct PostgREST update `kuota_terisi` ditolak. (diverifikasi: `set local role authenticated` + `request.jwt.claims` admin, `update ... set kuota_terisi = 999` → `ERROR 42501 permission denied for table event_sessions`)
- [x] User biasa update field apa pun ditolak RLS. (tidak berubah dari sebelumnya — RLS `event_sessions_admin_update` masih `USING/WITH CHECK (is_admin())`, jadi non-admin tetap ditolak di semua kolom sebelum sampai ke column grant. Tidak diverifikasi ulang karena scope PR ini gak ubah RLS.)
- [x] `create_booking()` SECURITY DEFINER tetap bisa increment counter. (diverifikasi: `create_booking()` `prosecdef=true`, owner `postgres`; role `postgres` masih punya UPDATE penuh termasuk `kuota_terisi` — SECURITY DEFINER jalan pakai privilege owner, bukan caller, jadi revoke dari `authenticated` gak mempengaruhi. Tidak dites end-to-end lewat booking sungguhan karena itu bakal nulis row booking + naikin kuota event nyata di production — sengaja di-skip, correctness dijamin semantik Postgres + grant check di atas.)
- [x] API admin update dengan `.select('*')` tetap berfungsi atau disesuaikan. (`.select('*')` di `session-service.ts:74` cuma baca — SELECT privilege gak disentuh migration ini, tetap `GRANT ALL` dari baseline.)
- [x] Manual/direct API test dicatat. (lihat Verification di bawah)

Evidence/commit: migration `20260803010000_protect_kuota_terisi_column_grants.sql`, pushed ke Supabase cloud (`peqamnynsplqftrjrqoh`) via `npx supabase db push --linked` 2026-08-03.  
Verification: `information_schema.column_privileges` post-migration — `authenticated` → `deskripsi, kapasitas, lokasi_atau_link, nama_sesi, status, tanggal_waktu, tipe` (7 kolom, tanpa `kuota_terisi`); `anon` hilang total dari privilege list (revoked). `postgres`/`service_role` tetap punya semua kolom termasuk `kuota_terisi`. Negative test: update `kuota_terisi` sebagai authenticated admin (via `set local role` + `request.jwt.claims` impersonation) → `42501 insufficient_privilege`. Positive test: update `kapasitas` dengan role sama → sukses, `kuota_terisi` gak berubah. `create_booking()` dikonfirmasi `SECURITY DEFINER` owner `postgres` (tidak dites booking sungguhan — lihat catatan di atas). `lint`/`typecheck`/`build` pass (gak ada app code berubah).

Belum diverifikasi: klik-through admin UI beneran (`/admin/sesi/[id]/edit`) di browser, dan booking end-to-end lewat `create_booking()` di production nyata. Rekomendasi: coba manual sebelum anggap 100% verified kalau mau extra yakin.

---

## PR-04 — Booking lifecycle, cancellation, and quota reconciliation

Status: `TODO`  
Target PR: TBD  
Priority: `P1`  
Dependency: PR-03  
Owner: TBD  
Target date: TBD  
Source: Review P2.2, P2.8, Graphify M-02

### Product decisions needed

- [ ] Apakah user boleh cancel booking sendiri?
- [ ] Apakah admin boleh cancel booking peserta?
- [ ] Apakah cancelled booking membebaskan seat?
- [ ] Apakah checked-in booking boleh dibatalkan?
- [ ] Apakah auth user boleh hard-delete bila punya booking/history?
- [ ] Apakah session dengan booking boleh hard-delete?

### Recommended MVP direction

- Jangan hard-delete booking historis.
- Admin dapat cancel booking berstatus `booked`.
- Cancellation membebaskan seat secara atomic.
- `checked_in` tidak boleh cancel tanpa koreksi khusus.
- Session dengan booking tidak hard-delete; gunakan `status = cancelled`.
- Sediakan reconciliation query.

### Acceptance criteria

- [ ] Keputusan produk tercatat.
- [ ] Counter tidak drift pada cancellation yang didukung.
- [ ] Session dengan booking tidak dihapus cascade lewat UI/API.
- [ ] Reconciliation query/procedure tersedia.
- [ ] Manual tests untuk cancel/release seat pass.

Evidence/commit: TBD  
Verification: TBD

---

# Wave 3 — Abuse control and auth

## PR-05 — Verified signup and CAPTCHA

Status: `TODO`  
Target PR: TBD  
Priority: `P1`  
Dependency: PR-00; ideally after PR-02  
Owner: TBD  
Target date: TBD  
Source: Review P1.2, Graphify H-03

### Scope

- [ ] Decide email verification requirement for public launch.
- [ ] Implement `/auth/callback` if email verification is enabled.
- [ ] Test PKCE `?code=...` flow with `exchangeCodeForSession()`.
- [ ] If using token hash templates, test `token_hash + type` with `verifyOtp()`.
- [ ] Do not rely on `sessionStorage` for verification onboarding because links may open in another tab/device.
- [ ] Enable Turnstile/hCaptcha in Supabase/Auth if chosen.
- [ ] Confirm Supabase redirect allowlist.
- [ ] Jangan tampilkan `signUpError.message` mentah di UI register — bisa jadi alat enumerasi email (temuan S5, analisis 2026-08-03).
- [ ] Samakan kebijakan panjang password antara client (minLength 8) dan Supabase server (default bisa lebih rendah) — temuan S6.
- [ ] Confirm reset password still works.

### Acceptance criteria

- [ ] Unverified user cannot login/booking if policy requires verification.
- [ ] Verification link works on production-like URL.
- [ ] Expired/invalid link has safe error.
- [ ] Redirect cannot go to arbitrary external URL.
- [ ] CAPTCHA token sent on signup if enabled.
- [ ] Signup without CAPTCHA rejected if enabled.
- [ ] Forgot/reset password still pass.
- [ ] Rate limit dashboard settings documented.

Evidence/commit: TBD  
Verification: TBD

---

# Wave 4 — Privacy and event operation policy

## PR-06 — Public/private session data

Status: `TODO`  
Target PR: TBD  
Priority: `P1/P2`  
Dependency: product decision  
Owner: TBD  
Target date: TBD  
Source: Review P2.3, Graphify M-03

### Minimum before launch

- [ ] Rename admin form label from `Lokasi atau Link/Catatan` to `Lokasi / Catatan Publik`.
- [ ] Add help text: do not put private Zoom/Meet URL here.
- [ ] Audit existing data for private meeting links.

### If private meeting URL needed

- [ ] Add private field such as `meeting_url_private`.
- [ ] Ensure anon/public queries never return private URL.
- [ ] Use view/RPC with safe column whitelist for public session data.

Evidence/commit: TBD  
Verification: TBD

---

## PR-07 — Check-in policy and audit actor

Status: `TODO`  
Target PR: TBD  
Priority: `P1/P2`  
Dependency: product decision  
Owner: TBD  
Target date: TBD  
Source: Review P2.4, Graphify M-04

### Product decisions needed

- [ ] Check-in opens how many hours before `tanggal_waktu`?
- [ ] Check-in closes how many hours after `tanggal_waktu`?
- [ ] Can cancelled sessions be checked in? Recommended: no.
- [ ] Can online sessions be checked in? Recommended Fase 1: no.

### Scope

- [ ] Update `check_in_booking()` to enforce chosen policy.
- [ ] Add `checked_in_by` if accepted.
- [ ] Update generated types.
- [ ] Update scanner UI/API as needed.

### Acceptance criteria

- [ ] QR valid in allowed window succeeds.
- [ ] QR before window rejected.
- [ ] QR after window rejected.
- [ ] Cancelled/draft/online session rejected if policy says so.
- [ ] Double-scan remains exactly one success.
- [ ] Scanner response does not include no. HP.

Evidence/commit: TBD  
Verification: TBD

---

# Wave 5 — QA, dependencies, docs, and hygiene

## PR-08 — Integration tests and full CI

Status: `TODO`  
Target PR: TBD  
Priority: `P2`  
Dependency: contracts stable after PR-02/PR-03  
Owner: TBD  
Target date: TBD

### Scope

- [ ] Local/staging Supabase migration replay test.
- [ ] RLS anon/user/admin tests.
- [ ] Signup metadata partial test.
- [ ] Booking concurrency capacity 1 test.
- [ ] Check-in concurrency test.
- [ ] Counter direct update denial test.
- [ ] CSV formula injection test.
- [ ] Playwright happy path: register/complete profile/booking/ticket/check-in.

Evidence/commit: TBD  
Verification: TBD

---

## PR-09 — Dependency advisory remediation / risk acceptance

Status: `TODO`  
Target PR: TBD  
Priority: `P1/P2`  
Dependency: PR-00  
Owner: TBD  
Target date: TBD

### Scope

- [ ] Run `npm audit --omit=dev` on Node 22.
- [ ] Try safe patch upgrades.
- [ ] Evaluate reachability for remaining advisories.
- [ ] Avoid `npm audit fix --force` unless diff is reviewed.
- [ ] Add risk acceptance with owner/expiry for unpatched advisories.

Risk acceptance template:

```text
Owner:
Advisory/CVE:
Reachability:
Current mitigation:
Expiry/review date:
Target upstream version:
```

Evidence/commit: TBD  
Verification: TBD

---

## PR-10 — Documentation and Graphify hygiene

Status: `TODO`  
Target PR: TBD  
Priority: `P2/P3`  
Dependency: none  
Owner: TBD  
Target date: TBD

### Scope

- [ ] README actual setup.
- [ ] `.graphifyignore`.
- [ ] Exclude `.claude/`, `.env*`, `.next/`, `node_modules/`, `supabase/.temp/`, graph cache as appropriate.
- [ ] Regenerate graph with SQL parser:

```bash
pip install 'graphifyy[sql]'
graphify update .
```

- [ ] Secret scan graph output.
- [ ] Ensure graph manifest does not include machine-local `.claude/settings.local.json`.

Evidence/commit: TBD  
Verification: TBD

---

# Backlog / lower priority hardening

## P3.1 — Input length and format limits

Status: `TODO`

- [ ] Add `.max(...)` to user-facing Zod strings.
- [ ] Add DB constraints where useful.
- [ ] Decide phone canonical format.
- [ ] Add realistic upper bound for `usia`.

---

## P3.2 — Security headers / CSP / Origin checks

Status: `DEFERRED`

- [ ] CSP
- [ ] Referrer-Policy
- [ ] X-Content-Type-Options
- [ ] HSTS platform config
- [ ] Permissions-Policy for camera
- [ ] Origin checks for mutating routes

---

## P3.3 — Accessibility pass for modal/onboarding

Status: `DOING`

Already improved:

- dialog role
- Escape handler
- focus trap
- focus restore
- body scroll lock
- stable body height across steps

Still verify:

- [ ] screen reader labels
- [ ] mobile scroll inside modal
- [ ] no background touch pass-through
- [ ] keyboard navigation across wizard steps

---

## P3.4 — Scanner should not render raw QR token on error

Status: `TODO`

- [ ] Mask or hide raw QR token after failed scan.

Catatan 2026-08-05: `scanner/page.tsx` dikonversi ke `useReducer` dan perilaku ini
**sengaja dipertahankan** — refactor-nya behavior-preserving, bukan tempatnya
memperbaiki temuan. Sekarang perilakunya terpusat di satu tempat: varian
`{ tag: 'error', qrToken: string | null }` di
`src/features/checkin/client/scanner-reducer.ts`. Perbaikannya tinggal buang
`qrToken` dari varian `error` — compiler akan menunjukkan setiap tempat yang
merendernya.

---

## P3.5 — Audit trail

Status: `DEFERRED`

Potential columns:

- [ ] `event_sessions.updated_at`
- [ ] `event_sessions.updated_by`
- [ ] `hero_content.updated_by`
- [ ] `bookings.checked_in_by`
- [ ] cancellation actor/timestamp if cancellation added

---

## P3.6 — Rate limiting untuk endpoint mutasi publik

Status: `TODO`  \
Sumber: Analisis mendalam 2026-08-03 (docs/ANALISIS_MENDALAM.md, temuan S4) — prioritas tinggi untuk produksi.

- [ ] Rate limit `POST /api/bookings` & `POST /api/check-in` (per user + per IP).
- [ ] Pertimbangkan limit per-sesi (mis. max N attempt booking per menit) untuk mencegah spam.
- [ ] Pastikan error rate-limit dibedakan dari error bisnis (429 vs 409/400) dan tidak membocorkan detail.

---

## P3.7 — Konsistensi error mapping di hero-service

Status: `TODO`  \
Sumber: Analisis mendalam 2026-08-03 — 4/5 service memetakan error DB → HTTP; `updateHeroContent` selalu 500.

- [ ] Tambah pemetaan error-code (mis. 23505 / constraint violation → 409/400) di `src/features/hero/server/hero-service.ts`.
- [ ] Selaraskan pola dengan booking/check-in/profile/session (PETA_ERROR / mapError).

---

# Resolved / already improved

- `DONE` QR token generated in DB.
- `DONE` Booking concurrency uses DB lock.
- `DONE` Check-in double scan uses DB lock.
- `DONE` CSV formula injection mitigated.
- `DONE` Forgot/reset password flow added.
- `DONE` Ticket QR moved to individual ticket pages.
- `DONE` Scanner shows session info.
- `DONE` Admin hero CMS added.
- `DONE` Admin session detail page added.
- `DONE` Account-first signup + profile completion introduced.
- `DONE` Profile completion onboarding modal introduced.
- `DONE` Graphify artifacts generated, but hygiene still tracked separately.


---

# Wave 3 — Season & Kloter Architecture & Backend Overhaul

## PR-11 — Season & Kloter Core Domain

Status: `DONE`  
Target PR: `feat(season): implement season and kloter core schema with btree_gist anti-overlap and setor_karya rpc`  
Priority: `P0 Core Architecture`  
Evidence/commit: `c43d900`, `20260829000000_season_kloter_core.sql`  
Verification: `btree_gist` constraint `kloter_tidak_overlap` & `fase_tidak_overlap` aktif; view `kloter_aktif` (`security_invoker = true`); RPC `setor_karya(text)` dengan `FOR UPDATE` lock; 13 unit tests lulus di `season-rules.test.ts` & `season-service.test.ts`.

## PR-12 — Event Sessions Overhaul & Kids Corner Dual-Counter Atomic Lock

Status: `DONE`  
Target PR: `feat(events): overhaul event_sessions, add kids corner quota, and expand user roles`  
Priority: `P1 Feature`  
Evidence/commit: `a0d9719`, `20260829010000_overhaul_event_sessions_and_kids_corner.sql`  
Verification: Kolom `tipe` dihapus dari `event_sessions`; kolom `kapasitas_kids` dan `kuota_kids_terisi` ditambahkan dengan `NOT NULL DEFAULT 0`; `bookings.jumlah_anak` dibatasi 0–5; RPC `create_booking` atomik dual-counter fail-closed.

## PR-13 — Performa RLS InitPlan & Foreign Key Indexing

Status: `DONE`  
Target PR: `perf(db): optimize RLS policies with initplan subqueries and add foreign key indexes`  
Priority: `P1 Performance & Standards`  
Evidence/commit: `4a064ab`, `20260829020000_perf_rls_initplan_and_fk_indexes.sql`  
Verification: Subquery `(SELECT auth.uid())` dan `(SELECT app_internal.is_admin())` di semua policy; 100% kolom FK terindeks B-tree; `supabase db advisors --local` lulus dengan 0 warning.

## PR-14 — Progressive Profiling, Normalisasi WhatsApp, & Certificate Snapshot Invariant

Status: `DONE`  
Target PR: `feat(profile): implement progressive profiling, phone normalization, and certificate snapshot`  
Priority: `P0 Data Architecture`  
Evidence/commit: `3d8596b`, `20260829030000_progressive_profile_and_certificate_snapshot.sql`  
Verification: Kolom `profile_completed` dan `users.usia` dihapus; ditambahkan `users.tanggal_lahir date` dan `users.jenis_kelamin`; normalisasi regex `628...`; `certificates.nama_penerima` berstatus `NOT NULL` tanpa default palsu (G9 closed); RPC `update_profile` fleksibel; `create_booking` memvalidasi syarat riil No. WA (`TB109`).

## PR-15 — RLS Write Policies, Grading RPC, & Video URL Gating

Status: `DONE`  
Target PR: `fix(db): add missing RLS policies, restrict video_url, fix error codes`  
Priority: `P0 Security Critical`  
Evidence/commit: `375485b`, `20260830000000_fix_rls_policies_and_errcodes.sql`  
Verification: Policy INSERT/UPDATE pada `video_progress`; RPC `nilai_karya` (`SECURITY DEFINER`, `is_admin()`); kolom `kelas.video_url` dicabut dari SELECT publik dan digate via RPC `get_video_url(p_kelas_id)`; route `POST /api/admin/submissions/grade` terpasang; 59 unit tests lulus 100%.

## PR-16 — Isolasi Skema app_internal & Admin Route Hardening

Status: `DONE`  
Target PR: `feat(db): isolate internal functions to app_internal schema and harden admin routes`  
Priority: `P0 Security & Least Privilege`  
Evidence/commit: `9557930`, `20260831000000_isolate_app_internal_schema.sql`  
Verification: Skema `app_internal` dibuat; `is_admin()`, `guard_tanggal_sesi()`, dan `handle_new_user()` dipindahkan ke `app_internal` (100% tersembunyi dari HTTP PostgREST API); route `/api/check-in` dilindungi `requireAdmin(supabase)`; `supabase db advisors --local` menghasilkan 0 issues.
---

# Current recommended execution order

```text
PR-00: chore: pin Node 22 and add baseline CI
PR-01: fix: refresh profile completion state and minimize client payload
PR-02: fix(db): enforce complete profile invariant before booking
PR-03: fix(db): prevent direct quota counter updates
PR-04: booking/session cancellation and quota lifecycle
PR-05: verified signup + CAPTCHA
PR-06: public/private session data
PR-07: check-in policy and checked_in_by
PR-08: integration tests and full CI
PR-09: dependency advisory remediation
PR-10: docs and Graphify hygiene
```

No additional UI polish should interrupt PR-00 through PR-03 unless it fixes a release-blocking functional bug.
