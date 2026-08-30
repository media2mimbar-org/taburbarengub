# Graph Report - .  (2026-08-30)

## Corpus Check
- 105 files · ~58,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 667 nodes · 1030 edges · 50 communities (32 shown, 18 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 24 edges
2. `Database` - 19 edges
3. `cn()` - 18 edges
4. `compilerOptions` - 17 edges
5. `BackLink()` - 16 edges
6. `README.md — TaburBarengUB Project README` - 13 edges
7. `Review Action Tracker — TaburBarengUB` - 12 edges
8. `scripts` - 11 edges
9. `getProfileGate()` - 10 edges
10. `formatDateTime()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `CI Workflow (GitHub Actions: Lint, Typecheck, Build)` --references--> `Quality Checks (npm run lint/typecheck/build)`  [EXTRACTED]
  .github/workflows/ci.yml → README.md
- `CI Dummy Environment Variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_TELEMETRY_DISABLED)` --shares_data_with--> `Environment Variables Setup (.env.local, NEXT_PUBLIC_*)`  [INFERRED]
  .github/workflows/ci.yml → README.md
- `Node.js Setup via .nvmrc (actions/setup-node@v4)` --shares_data_with--> `Node.js 22 Requirement (.nvmrc)`  [INFERRED]
  .github/workflows/ci.yml → README.md
- `Next.js Agent Rules` --references--> `CLAUDE.md AGENTS.md Include`  [EXTRACTED]
  AGENTS.md → CLAUDE.md
- `File / Document Icon` --semantically_similar_to--> `Globe / World Icon`  [INFERRED] [semantically similar]
  public/file.svg → public/globe.svg

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Layered Next.js Architecture Structure** — concept_presentation_layer, concept_client_interaction_layer, concept_api_controller_layer, concept_service_layer, concept_auth_data_access_helper, concept_database_enforcement_layer, concept_navigation_layer [EXTRACTED 1.00]
- **Review Action Tracker Wave Slices** — task_pr_00_toolchain_baseline, task_pr_01_profile_refresh_payload, task_pr_02_enforce_profile_completion_db, task_pr_03_protect_kuota_terisi, task_pr_04_booking_lifecycle, task_pr_05_verified_signup_captcha, task_pr_06_public_private_session_data, task_pr_07_checkin_policy_audit, task_pr_08_integration_tests_ci, task_pr_09_dependency_remediation, task_pr_10_doc_graphify_hygiene [EXTRACTED 1.00]
- **Roadmap Work Phases** — phase_r_restructurization, phase_r_plus_navigation, phase_restyle_design_system [EXTRACTED 1.00]
- **Smoke Test Validation Suite** — checklist_public_landing, checklist_auth_flow, checklist_admin_session_management, checklist_admin_hero_cms, checklist_user_booking, checklist_qr_checkin, checklist_admin_participants_csv, checklist_back_link_navigation [EXTRACTED 1.00]
- **Brand Icon and OG Assets** — asset_apple_icon_png, asset_icon_png, asset_icon_svg, asset_icon2_png, asset_opengraph_image_png, asset_opengraph_image_alt [EXTRACTED 1.00]
- **CI Quality Gate: Lint + Typecheck + Build** — github_workflows_ci_workflow, github_workflows_ci_lint_step, github_workflows_ci_typecheck_step, github_workflows_ci_build_step [EXTRACTED 1.00]

## Communities (50 total, 18 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (23): menuItems, dancingScript, fraunces, metadata, poppins, BackLink(), HistoryDepthTracker(), createInitialState() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (26): PATCH(), paramsSchema, PATCH(), POST(), POST(), checkInBooking(), CheckInError, CheckInResult (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (38): babel-plugin-react-compiler, eslint, eslint-config-next, allowScripts, sharp@0.34.5, unrs-resolver@1.12.2, devDependencies, babel-plugin-react-compiler (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (38): Admin Hero CMS Smoke Checklist, Admin Participants & CSV Export Smoke Checklist, Admin Session Management Smoke Checklist, Auth Flow Smoke Checklist, Back-Link & Deep Navigation Smoke Checklist, Public Landing Smoke Checklist, QR Check-in Smoke Checklist, User Booking Smoke Checklist (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (25): escapeCsvCell(), ExportBooking, formatDateTimeForFilename(), GET(), safeFilename(), toCsv(), AdminPesertaPage(), getStatusStyle() (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (28): PATCH(), bookingStatusBadgeStyle(), bookingStatusLabel(), Home(), CompleteProfilePage(), SessionSummary, TicketDetailPage(), SessionSummary (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (37): @base-ui/react, class-variance-authority, clsx, @fontsource/hauora-sans, lucide-react, next, dependencies, @base-ui/react (+29 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (25): HeroTreeScene(), HeroTreeSceneProps, TaburIconProps, TaburLockup(), TaburLockupProps, TaburLockupTextProps, TaburMark(), TaburMarkProps (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (29): BookingCtaAction(), disabledButtonStyle, primaryLinkStyle, SessionDetailPage(), ticketLabel(), ticketLinkStyle, BookingButton(), BookingCta (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (28): Certificate, CertificateInsert, CertificateType, CertificateUpdate, Kelas, KelasInsert, KelasUpdate, Kloter (+20 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (21): POST(), POST(), getUserSubmissions(), gradeSubmission(), submitWriting(), createMockSupabaseClient(), MockQueryState, MockSupabaseOptions (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (21): AUDIT_HANDOFF.md (referenced, not read), docs/ARCHITECTURE.md (referenced, not read), docs/SMOKE_TEST.md (referenced, not read), Build Step (npm run build), CI Dummy Environment Variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_TELEMETRY_DISABLED), Install Step (npm ci), Lint Step (npm run lint), Node.js Setup via .nvmrc (actions/setup-node@v4) (+13 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (15): POST(), getClassListWithProgress(), submitQuizProgress(), SubmitQuizResult, MockHandler, QueryState, RpcHandler, VideoProgressRow (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (20): /admin/scanner page, POST /api/bookings, POST /api/check-in, bookings table, check_in_booking() RPC, create_booking() RPC, Scanner data minimization, event_sessions table (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (19): Column-level Grants on event_sessions, Database-Enforced Invariants, profile_completed_requires_full_profile Constraint, ProfileCompletionData Narrow Type, System-Managed Quota Counter Policy, Review Action Tracker — TaburBarengUB, Rationale: RLS/RPC as Inviolable Final Enforcement, Rationale: Disallowing Direct Quota Counter Editing (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (16): html5-qrcode, html5-qrcode, AdminScannerPage(), CameraDevice, getStatusColor(), getStatusLabel(), Html5QrcodeModule, Html5QrcodeScanner (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (12): getActiveKloter(), getPublicCalendar, getPublicSeasonCalendar(), getSeasonDetails, getSeasonOverview(), MockQueryHandler, KloterAktif, PublicSeasonCalendar (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (7): POST(), Booking, BookingError, createBooking(), PETA_ERROR, CreateBookingInput, createBookingSchema

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (8): CompositeTypes, Constants, DatabaseWithoutInternals, DefaultSchema, Enums, Tables, TablesInsert, TablesUpdate

### Community 22 - "Community 22"
Cohesion: 0.43
Nodes (6): canAccessVideo(), CanAccessVideoParams, getPhaseLabel(), isSubmissionWindowOpen(), PHASE_LABELS, PhaseType

### Community 23 - "Community 23"
Cohesion: 0.53
Nodes (4): punyaCookieSesi(), updateSession(), config, proxy()

### Community 24 - "Community 24"
Cohesion: 0.50
Nodes (4): Apple Touch Icon PNG (180x180), App Alternative Favicon PNG, App Favicon PNG (32x32), App Favicon SVG (Official Mark: Leaf #81A37E + Seed #CEE0BA)

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (3): /admin/peserta/export.csv PII export, handle_new_user() trigger, users table

### Community 26 - "Community 26"
Cohesion: 1.00
Nodes (3): File / Document Icon, Globe / World Icon, Window / Browser Icon

## Knowledge Gaps
- **254 isolated node(s):** `eslintConfig`, `nextConfig`, `config`, `CLAUDE.md AGENTS.md Include`, `Supabase Postgres` (+249 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 6` to `Community 17`, `Community 2`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `AdminScannerPage()` connect `Community 17` to `Community 4`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `html5-qrcode` connect `Community 17` to `Community 6`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `config` to the rest of the system?**
  _254 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08826945412311266 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._