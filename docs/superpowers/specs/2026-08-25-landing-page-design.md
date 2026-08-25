# Design Spec: Landing Page Implementation (rev 5.1)

- **Date:** 2026-08-25
- **Branch:** `rombak`
- **Reference Artifact:** `~/Dokumen/tabur-handoff-22agt/tabur-handoff/landing-tabur-rev5.html`
- **Scope:** Convert static HTML handoff into modular Next.js landing page with shadcn UI (Base UI preset) while keeping page rendering 100% static with a client island for auth navigation.

---

## 1. Overview & Architecture

The root `/` route serves as the marketing landing page for TaburBarengUB. To maximize edge cacheability and minimize TTFB, the landing page is implemented as a **pure static Server Component** (`○ Static`).

### 1.1 Rendering Strategy
- **Static Shell (`src/app/page.tsx`)**: Renders all visual sections without server-side database or cookie access.
- **Client Island (`NavAuthButton`)**: A single `"use client"` micro-component inside the floating navigation bar that queries local browser session from Supabase to switch between `"Masuk"` (link to `/login`) and `"Buka App"` (link to `/app`).
- **Progressive Reveal (`Reveal`)**: A `"use client"` component implementing the handoff's `IntersectionObserver` progressive animation (`.js-anim` pattern) without hiding content if JavaScript fails or is delayed.

---

## 2. Design Tokens & Styling Foundation

### 2.1 Tooling & Base Preset
- Run `npx shadcn@latest init` configured with **Base UI** (`base-nova` preset) and Tailwind v4.
- Only install necessary composable primitives: `button`, `card`, `badge`, `separator`.

### 2.2 Token Mapping in `globals.css`
Port the 3-layer token system from `landing-tabur-rev5.html` directly into `@theme inline` / CSS root variables:
- **Colors**:
  - Primitives: `--color-salju (#F6FAFD)`, `--color-embun (#E9F1F7)`, `--color-langit-pagi (#D8E6F2)`, `--color-kebiruan-halus (#EEF6F2)`, `--color-tunas-muda (#DDECCE)`, `--color-hijau-segar (#C6E1B4)`, `--color-hijau-lembut (#A6C49A)`, `--color-hijau-alami (#7BA27A)`, `--color-biru-tafakur (#2F3E4E)`, `--color-hijau-tua (#4F7050)`, `--color-hijau-pekat (#3F5A40)`.
  - Semantic: `--color-bg-page`, `--color-bg-surface`, `--color-bg-band-kalem`, `--color-bg-band-embun`, `--color-bg-brand-soft`, `--color-bg-footer`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-brand`, `--color-action-primary-bg`, `--color-action-primary-bg-hover`, `--color-action-primary-text`, `--color-border-default`, `--color-border-focus`, `--color-rail`.
- **Typography & Fonts**:
  - `--font-headline`: `Fraunces` via `next/font/google`
  - `--font-sub`: `Poppins` via `next/font/google`
  - `--font-accent`: `Dancing Script` via `next/font/google`
  - `--font-body`: `Hauora Sans` via `@fontsource/hauora-sans` (self-hosted)
- **Spacing & Radii**:
  - Spacing: `--spacing-2xs` (4px) through `--spacing-4xl` (96px).
  - Radii: `--radius-sm` (6px), `--radius-md` (12px), `--radius-lg` (20px), `--radius-full` (999px).
  - Elevation & Shadows: `--shadow-low`, `--shadow-medium`, `--shadow-high` (tinted with `rgba(47,62,78, ...)`).

---

## 3. Assets & Brand Components

### 3.1 Static Files
1. **Favicon Set**: Copy all files from `~/Dokumen/tabur-handoff-22agt/tabur-handoff/favicon/` into `src/app/` (`favicon.ico`, `favicon.svg`, `favicon-32.png`, `favicon-192.png`, `apple-touch-icon.png`).
2. **OpenGraph Image**: Copy `~/Dokumen/tabur-handoff-22agt/tabur-handoff/og/og-image.png` to `public/og-image.png`.

### 3.2 Vector Components (`src/components/brand/`)
- `tabur-mark.tsx`: Official leaf + seed mark from `~/Downloads/tabur-design/main logo tabur.svg` (retaining SVG paths, `currentColor` / CSS variable styling support).
- `tabur-wordmark.tsx`: Optical offset (+50) wordmark and standard geometric wordmark from `~/Dokumen/tabur-handoff-22agt/tabur-handoff/logo/tabur-wordmark-FINAL-optik.svg` & `tabur-wordmark-biasa.svg`.
- `tabur-lockup.tsx`: Footer brand lockup combining icon and Roca typography.
- `hero-tree-scene.tsx`: The bottom tree and rolling hill SVG illustration with fixed minimum width behavior.

---

## 4. Component Structure & Hierarchy

```
src/
├── app/
│   ├── layout.tsx                # Inject font variables & metadata
│   ├── page.tsx                  # Static Landing Page container
│   ├── favicon.ico / favicon.svg # App icons
│   └── globals.css               # Design tokens, Tailwind v4 theme, landing classes
└── components/
    ├── brand/                    # Pure SVG Vector brand components
    │   ├── tabur-mark.tsx
    │   ├── tabur-wordmark.tsx
    │   ├── tabur-lockup.tsx
    │   └── hero-tree-scene.tsx
    ├── landing/                  # Landing sections (composable blocks)
    │   ├── landing-nav.tsx       # Pill nav with glassmorphism
    │   ├── nav-auth-button.tsx   # Client island: session swap (Masuk vs Buka App)
    │   ├── hero-section.tsx      # Clouds, wordmark, actions, tree scene
    │   ├── video-section.tsx     # "Apa Itu Tabur" band & play frame
    │   ├── manifesto-section.tsx # Typography-heavy narrative grid
    │   ├── kenapa-tabur-section.tsx # Split layout with inline wordmark
    │   ├── sang-guru-section.tsx # Split layout for Ustadz Budi Ashari
    │   ├── program-section.tsx   # 4-step horizontal/vertical timeline rail
    │   ├── kajian-section.tsx    # Single offline kajian feature card
    │   ├── stats-section.tsx     # 3-stat metric ribbon
    │   ├── footer-section.tsx    # Dark footer, lockup, social links
    │   └── reveal.tsx            # Progressive intersection observer wrapper
    └── ui/                       # shadcn composable primitives
        ├── button.tsx
        ├── card.tsx
        ├── badge.tsx
        └── separator.tsx
```

---

## 5. Section Specifications

1. **Floating Navigation (`LandingNav`)**:
   - Fixed pill shape (`rgba(255,255,255,0.85)` + backdrop-blur).
   - Brand mark on start, anchor links (`#program`, `#kajian`), `Separator`, and `NavAuthButton` + primary CTA (`#program`).
2. **Hero (`HeroSection`)**:
   - Soft sky gradient background, 3 blurred ambient cloud shapes.
   - Central `TaburWordmark` with optical +50 bias.
   - Script tagline: `"tadabbur, bersama"`.
   - Dual actions: Solid Button (`#kajian`) + Ghost Button (`#program`).
   - Ground scene: Responsive hill and stylized tree SVG.
3. **Apa Itu Tabur (`VideoSection`)**:
   - Soft band background (`--color-bg-band-kalem`).
   - 16:9 responsive video placeholder container with centered hover-scaled play button.
4. **Manifesto (`ManifestoSection`)**:
   - Asymmetric 2-column grid: Large serif/script heading on left, 2 explanatory paragraphs on right.
5. **Kenapa Tabur (`KenapaTaburSection`)**:
   - Split media & text: Left dashed media placeholder ("Foto: menabur benih"), right heading with inline SVG wordmark.
6. **Sang Guru (`SangGuruSection`)**:
   - Split reverse media & text: Left 3:4 aspect ratio media placeholder ("Foto: Ustadz Budi Ashari"), right guru narrative.
7. **Program / Kelas (`ProgramSection`)**:
   - Embun background band (`--color-embun`).
   - 4-step steps rail: Vertical on mobile (`<1024px`), horizontal connected rail on desktop (`>=1024px`).
   - Step icons rendered as clean inline SVG strokes.
   - Bottom CTA + static informative badge (`"Pendaftaran dibuka berkala..."`).
8. **Kajian Terdekat (`KajianSection`)**:
   - Centered single event feature card using shadcn `Card` + `Badge`.
   - Hardcoded data matching rev5: Ahad, 19 Oktober @ Masjid Raya UB.
9. **Stats Ribbon (`StatsSection`)**:
   - 3-column stats grid with clean borders (`1 Season Berjalan`, `1.500 Peserta Kajian`, `200 Karya Tadabbur`).
10. **Footer (`FooterSection`)**:
    - Dark background (`--color-bg-footer`).
    - Full brand lockup, social icon links (Instagram, YouTube, WhatsApp), copyright colophon.

---

## 6. Verification & Acceptance Criteria

1. **Build & Typecheck**: `npm run lint && npm run typecheck && npm run build` completes without errors.
2. **Prerender Output**: Next.js build output marks `/` as `○ (Static)`.
3. **Smoke Tests (Local Server)**:
   - `GET /` returns HTML containing full landing content (Hero, Apa Itu Tabur, Manifesto, Kenapa Tabur, Sang Guru, Program, Kajian, Stats, Footer).
   - In browser: Nav CTA starts at `"Masuk"`. When logged in, client island updates to link to `/app`.
   - Step rail shifts from vertical to horizontal at `1024px` breakpoint.
   - Visual comparison matches `landing-tabur-rev5.html` in mobile and desktop viewports.
   - `/app` and other existing routes remain completely functional without regressions.
