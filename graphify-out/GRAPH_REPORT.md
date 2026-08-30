# Graph Report - .  (2026-08-30)

## Corpus Check
- 109 files · ~62,929 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 708 nodes · 1088 edges · 48 communities (31 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.87)
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
- Community 44

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 24 edges
2. `Database` - 19 edges
3. `cn()` - 18 edges
4. `compilerOptions` - 17 edges
5. `BackLink()` - 16 edges
6. `README.md — TaburBarengUB Project README` - 13 edges
7. `Review Action Tracker — TaburBarengUB` - 12 edges
8. `Design Spec: Landing Page Implementation (rev 5.1)` - 12 edges
9. `scripts` - 11 edges
10. `getProfileGate()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Design Spec: Landing Page Implementation (rev 5.1)` --semantically_similar_to--> `OpenGraph Image Alt Text`  [INFERRED] [semantically similar]
  docs/superpowers/specs/2026-08-25-landing-page-design.md → src/app/opengraph-image.alt.txt
- `Task 2: Design Tokens, Typography & Asset Pipeline` --shares_data_with--> `OpenGraph Banner Image PNG (1200x630)`  [INFERRED]
  docs/superpowers/plans/2026-08-25-landing-page.md → src/app/opengraph-image.png
- `Task 3: Consolidated Brand Vector Components` --shares_data_with--> `App Favicon SVG (Official Mark: Leaf #81A37E + Seed #CEE0BA)`  [INFERRED]
  docs/superpowers/plans/2026-08-25-landing-page.md → src/app/icon.svg
- `CI Workflow (GitHub Actions: Lint, Typecheck, Build)` --references--> `Quality Checks (npm run lint/typecheck/build)`  [EXTRACTED]
  .github/workflows/ci.yml → README.md
- `CI Dummy Environment Variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_TELEMETRY_DISABLED)` --shares_data_with--> `Environment Variables Setup (.env.local, NEXT_PUBLIC_*)`  [INFERRED]
  .github/workflows/ci.yml → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Layered Next.js Architecture Structure** — concept_presentation_layer, concept_client_interaction_layer, concept_api_controller_layer, concept_service_layer, concept_auth_data_access_helper, concept_database_enforcement_layer, concept_navigation_layer [EXTRACTED 1.00]
- **Review Action Tracker Wave Slices** — task_pr_00_toolchain_baseline, task_pr_01_profile_refresh_payload, task_pr_02_enforce_profile_completion_db, task_pr_03_protect_kuota_terisi, task_pr_04_booking_lifecycle, task_pr_05_verified_signup_captcha, task_pr_06_public_private_session_data, task_pr_07_checkin_policy_audit, task_pr_08_integration_tests_ci, task_pr_09_dependency_remediation, task_pr_10_doc_graphify_hygiene [EXTRACTED 1.00]
- **Roadmap Work Phases** — phase_r_restructurization, phase_r_plus_navigation, phase_restyle_design_system [EXTRACTED 1.00]
- **Smoke Test Validation Suite** — checklist_public_landing, checklist_auth_flow, checklist_admin_session_management, checklist_admin_hero_cms, checklist_user_booking, checklist_qr_checkin, checklist_admin_participants_csv, checklist_back_link_navigation [EXTRACTED 1.00]
- **Landing Page Plan Tasks** — task_landing_setup_shadcn_base_nova, task_landing_design_tokens_assets, task_landing_brand_vectors, task_landing_client_islands [EXTRACTED 1.00]
- **Season & Kloter Backend Tasks** — task_season_kloter_migration, task_season_types_rules, task_season_service_layer, task_classroom_video_progress_service, task_submission_grading_service, task_season_api_routes [EXTRACTED 1.00]
- **Landing Page 8 Semantic Sections** — concept_landing_nav_section, concept_landing_hero_section, concept_landing_video_section, concept_landing_manifesto_section, concept_landing_kenapa_tabur_section, concept_landing_sang_guru_section, concept_landing_program_section, concept_landing_kajian_section, concept_landing_stats_section, concept_landing_footer_section [EXTRACTED 1.00]
- **Brand Icon and OG Assets** — asset_apple_icon_png, asset_icon_png, asset_icon_svg, asset_icon2_png, asset_opengraph_image_png, asset_opengraph_image_alt [EXTRACTED 1.00]
- **CI Quality Gate: Lint + Typecheck + Build** — github_workflows_ci_workflow, github_workflows_ci_lint_step, github_workflows_ci_typecheck_step, github_workflows_ci_build_step [EXTRACTED 1.00]

## Communities (48 total, 17 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (44): bookingStatusBadgeStyle(), bookingStatusLabel(), Home(), CompleteProfilePage(), SessionSummary, TicketDetailPage(), SessionSummary, TiketSayaPage() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (27): menuItems, dancingScript, fraunces, metadata, poppins, BackLink(), HistoryDepthTracker(), createInitialState() (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (49): Admin Hero CMS Smoke Checklist, Admin Participants & CSV Export Smoke Checklist, Admin Session Management Smoke Checklist, Auth Flow Smoke Checklist, Back-Link & Deep Navigation Smoke Checklist, Public Landing Smoke Checklist, QR Check-in Smoke Checklist, User Booking Smoke Checklist (+41 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (40): getActiveKloter(), getPublicCalendar, getPublicSeasonCalendar(), getSeasonDetails, getSeasonOverview(), MockQueryHandler, Certificate, CertificateInsert (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (38): babel-plugin-react-compiler, eslint, eslint-config-next, allowScripts, sharp@0.34.5, unrs-resolver@1.12.2, devDependencies, babel-plugin-react-compiler (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (37): @base-ui/react, class-variance-authority, clsx, @fontsource/hauora-sans, lucide-react, next, dependencies, @base-ui/react (+29 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (25): HeroTreeScene(), HeroTreeSceneProps, TaburIconProps, TaburLockup(), TaburLockupProps, TaburLockupTextProps, TaburMark(), TaburMarkProps (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (20): POST(), getClassListWithProgress(), submitQuizProgress(), SubmitQuizResult, MockHandler, QueryState, RpcHandler, VideoProgressRow (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (25): Apple Touch Icon PNG (180x180), App Alternative Favicon PNG, App Favicon PNG (32x32), App Favicon SVG (Official Mark: Leaf #81A37E + Seed #CEE0BA), OpenGraph Image Alt Text, OpenGraph Banner Image PNG (1200x630), Base UI / base-nova shadcn preset, Footer Section with Brand Lockup (+17 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (19): escapeCsvCell(), ExportBooking, formatDateTimeForFilename(), GET(), safeFilename(), toCsv(), AdminPesertaPage(), getStatusStyle() (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (19): POST(), getUserSubmissions(), submitWriting(), createMockSupabaseClient(), MockQueryState, MockSupabaseOptions, WritingSubmissionRow, GradeSubmissionInput (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (21): AUDIT_HANDOFF.md (referenced, not read), docs/ARCHITECTURE.md (referenced, not read), docs/SMOKE_TEST.md (referenced, not read), Build Step (npm run build), CI Dummy Environment Variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_TELEMETRY_DISABLED), Install Step (npm ci), Lint Step (npm run lint), Node.js Setup via .nvmrc (actions/setup-node@v4) (+13 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (20): /admin/scanner page, POST /api/bookings, POST /api/check-in, bookings table, check_in_booking() RPC, create_booking() RPC, Scanner data minimization, event_sessions table (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (19): Column-level Grants on event_sessions, Database-Enforced Invariants, profile_completed_requires_full_profile Constraint, ProfileCompletionData Narrow Type, System-Managed Quota Counter Policy, Review Action Tracker — TaburBarengUB, Rationale: RLS/RPC as Inviolable Final Enforcement, Rationale: Disallowing Direct Quota Counter Editing (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (12): on_auth_user_created, public.bookings, public.check_in_booking(), public.complete_user_profile(), public.create_booking(), public.event_sessions, public.guard_tanggal_sesi(), public.handle_new_user() (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (16): html5-qrcode, html5-qrcode, AdminScannerPage(), CameraDevice, getStatusColor(), getStatusLabel(), Html5QrcodeModule, Html5QrcodeScanner (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (11): paramsSchema, PATCH(), POST(), createEventSession(), EventSession, mapSessionSaveError(), SessionError, updateEventSession() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (13): PATCH(), AuthenticatedProfileGate, completeUserProfile(), PETA_ERROR, ProfileError, ProfileGate, updateUserProfile(), UserProfile (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.23
Nodes (8): POST(), checkInBooking(), CheckInError, CheckInResult, PETA_ERROR, CheckInInput, checkInSchema, Database

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (7): POST(), Booking, BookingError, createBooking(), PETA_ERROR, CreateBookingInput, createBookingSchema

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (6): PATCH(), HeroContent, HeroContentError, updateHeroContent(), HeroContentPayload, heroContentSchema

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (8): CompositeTypes, Constants, DatabaseWithoutInternals, DefaultSchema, Enums, Tables, TablesInsert, TablesUpdate

### Community 25 - "Community 25"
Cohesion: 0.43
Nodes (4): POST(), gradeSubmission(), AuthError, requireAdmin()

### Community 27 - "Community 27"
Cohesion: 0.53
Nodes (4): punyaCookieSesi(), updateSession(), config, proxy()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (3): /admin/peserta/export.csv PII export, handle_new_user() trigger, users table

### Community 29 - "Community 29"
Cohesion: 1.00
Nodes (3): File / Document Icon, Globe / World Icon, Window / Browser Icon

## Knowledge Gaps
- **274 isolated node(s):** `eslintConfig`, `nextConfig`, `config`, `CLAUDE.md AGENTS.md Include`, `Supabase Postgres` (+269 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 5` to `Community 17`, `Community 4`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `AdminScannerPage()` connect `Community 17` to `Community 10`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Why does `html5-qrcode` connect `Community 17` to `Community 5`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `config` to the rest of the system?**
  _274 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0701344243132671 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06103896103896104 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.04931972789115646 - nodes in this community are weakly interconnected._