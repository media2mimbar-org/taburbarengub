# Landing Page (rev 5.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete marketing landing page at `/` based on `landing-tabur-rev5.html`, using Base UI shadcn/ui components and Tailwind v4, keeping the page 100% static with a client island for the auth navigation swap.

**Architecture:** The landing page is a static Server Component (`src/app/page.tsx`) composing 8 semantic sections. Brand vector graphics are consolidated into `src/components/brand/tabur-brand.tsx`. Interactive parts are isolated into two micro client components: `NavAuthButton` (browser session detection) and `Reveal` (progressive enhancement scroll animations). 3-layer design tokens and typography are integrated into `globals.css` via `@theme inline`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui (Base UI preset `base-nova`), `@fontsource/hauora-sans`, `next/font/google` (Fraunces, Poppins, Dancing Script), `@supabase/ssr` / `@supabase/supabase-js`.

**Spec:** `docs/superpowers/specs/2026-08-25-landing-page-design.md`

## Global Constraints

- Landing page at `/` MUST remain `○ (Static)` in Next.js build output (zero server-side database/cookie calls in `page.tsx`).
- Single-use visual landing sections MUST be co-located directly within `src/app/page.tsx` (or helper functions in that file) to avoid over-fragmentation.
- Touch targets for buttons and interactive elements MUST be $\ge 44\text{px}$ (or `min-height: 2.5rem / 3rem`).
- Progressive animation (`Reveal`) MUST NOT hide content when JavaScript is unavailable or delayed (matches `.js-anim` progressive enhancement).
- Typography MUST respect system font settings (scaled in `rem` / `clamp()`).

---

### Task 1: Setup Tooling, Tailwind v4 & Minimal shadcn Primitives

**Files:**
- Create/Modify: `components.json`, `package.json`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/separator.tsx`, `src/lib/utils.ts`

**Interfaces:**
- Produces: Composable UI primitives in `src/components/ui/` (`Button`, `Card`, `Badge`, `Separator`) and `@/lib/utils` `cn()`.

- [ ] **Step 1: Install `@fontsource/hauora-sans`**

Run:
```bash
npm install @fontsource/hauora-sans@5.2.5
```

- [ ] **Step 2: Initialize shadcn with base-nova preset and Tailwind v4**

Run:
```bash
npx shadcn@latest init --preset base-nova --defaults
```
Verify that `components.json` is created with `"base": "base"` and `"style": "nova"`.

- [ ] **Step 3: Add minimal required shadcn components**

Run:
```bash
npx shadcn@latest add button card badge separator
```
Verify that `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, and `separator.tsx` are installed.

- [ ] **Step 4: Verify typecheck passes**

Run:
```bash
npm run typecheck
```
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components.json src/components/ui/ src/lib/utils.ts
git commit -m "chore: setup shadcn base-nova with minimal primitives and hauora font"
```

---

### Task 2: Design Tokens, Typography & Asset Pipeline

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/app/favicon.ico`, `src/app/favicon.svg`, `src/app/favicon-32.png`, `src/app/favicon-192.png`, `src/app/apple-touch-icon.png`, `public/og-image.png`

**Interfaces:**
- Consumes: Assets from `~/Dokumen/tabur-handoff-22agt/tabur-handoff/favicon/` & `og/`
- Produces: CSS variables for design tokens (`--color-*`, `--font-*`, `--spacing-*`, `--radius-*`, `--shadow-*`) and loaded Google/Hauora fonts on `<html>`/`<body>`.

- [ ] **Step 1: Copy favicon and OG image assets**

Run:
```bash
cp ~/Dokumen/tabur-handoff-22agt/tabur-handoff/favicon/* src/app/
cp ~/Dokumen/tabur-handoff-22agt/tabur-handoff/og/og-image.png public/
```

- [ ] **Step 2: Update `src/app/layout.tsx` to load fonts and define font CSS variables**

Edit `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Fraunces, Poppins, Dancing_Script } from 'next/font/google'
import '@fontsource/hauora-sans/400.css'
import '@fontsource/hauora-sans/600.css'
import '@fontsource/hauora-sans/700.css'
import { HistoryDepthTracker } from '@/components/ui/history-depth-tracker'
import './globals.css'

const fraunces = Fraunces({
  variable: '--font-headline',
  subsets: ['latin'],
  display: 'swap',
})

const poppins = Poppins({
  variable: '--font-sub',
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
})

const dancingScript = Dancing_Script({
  variable: '--font-accent',
  weight: ['600'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Tabur Bareng UB — Tadabbur Bersama Ustadz Budi Ashari',
  description: "Belajar memahami Qur'an dengan kaidah tadabbur — bareng Ustadz Budi Ashari. Kajian offline gratis & kelas online per season.",
  openGraph: {
    title: 'TaburBarengUB — Belajar Tadabbur, Selangkah demi Selangkah',
    description: "Belajar memahami Qur'an dengan kaidah tadabbur — bareng Ustadz Budi Ashari. Kajian offline gratis & kelas online per season.",
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      className={`${fraunces.variable} ${poppins.variable} ${dancingScript.variable}`}
    >
      <body>
        <HistoryDepthTracker />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Define 3-layer Design Tokens & Utilities in `src/app/globals.css`**

Update `src/app/globals.css` to contain the full design token suite (`--color-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, motion, and fluid layout classes `.wrap`, `.band`, `.hero-scene`, `.steps`, etc.) ported directly from `landing-tabur-rev5.html`.

- [ ] **Step 4: Verify build and font loading**

Run:
```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/favicon* src/app/apple-touch-icon.png public/og-image.png
git commit -m "feat: configure design tokens, fonts, and favicon assets for landing page"
```

---

### Task 3: Consolidated Brand Vector Components

**Files:**
- Create: `src/components/brand/tabur-brand.tsx`

**Interfaces:**
- Consumes: Vector data from `main logo tabur.svg` and `tabur-wordmark-FINAL-optik.svg`
- Produces: React components `TaburMark`, `TaburWordmark`, `TaburLockup`, and `HeroTreeScene`.

- [ ] **Step 1: Implement `src/components/brand/tabur-brand.tsx`**

Write `src/components/brand/tabur-brand.tsx` containing:
- `TaburMark`: SVG element with viewBox `359 197 1282 1606`, using leaf path `#81A37E` (or `var(--mark-leaf)`) and seed ellipse `#CEE0BA` (or `var(--mark-seed)`).
- `TaburWordmark`: SVG component supporting both optical offset (`+50`, default) and geometric center (`variant="biasa"`).
- `TaburLockup`: Combined SVG lockup combining icon and Roca wordmark outline with `currentColor` support for footer/brand headers.
- `HeroTreeScene`: Responsive ground hill paths (`#EDF3F9` and `var(--color-bg-band-kalem)`) and multi-canopy stylized tree SVG (`scale(2.05)`).

- [ ] **Step 2: Verify typecheck**

Run:
```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/brand/tabur-brand.tsx
git commit -m "feat: add consolidated SVG brand components"
```

---

### Task 4: Interactive Client Islands (`Reveal` & `NavAuthButton`)

**Files:**
- Create: `src/components/landing/reveal.tsx`, `src/components/landing/nav-auth-button.tsx`

**Interfaces:**
- Consumes: `@/lib/supabase/client` (`createClient`), `next/link`
- Produces: `Reveal` component (wrap sections for scroll animation) and `NavAuthButton` component (client-side auth toggle).

- [ ] **Step 1: Implement `src/components/landing/reveal.tsx`**

```tsx
'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function Reveal({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      el.classList.add('in')
      return
    }

    document.documentElement.classList.add('js-anim')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`reveal ${className}`} style={style}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Implement `src/components/landing/nav-auth-button.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function NavAuthButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setIsLoggedIn(true)
      }
    })
  }, [])

  if (isLoggedIn) {
    return (
      <Link
        href="/app"
        className="font-medium hover:text-[var(--color-text-brand)] transition-colors"
      >
        Buka App
      </Link>
    )
  }

  return (
    <Link
      href="/login"
      className="font-medium hover:text-[var(--color-text-brand)] transition-colors"
    >
      Masuk
    </Link>
  )
}
```

- [ ] **Step 3: Verify typecheck**

Run:
```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/reveal.tsx src/components/landing/nav-auth-button.tsx
git commit -m "feat: add Reveal progressive animation and NavAuthButton client island"
```

---

### Task 5: Assemble Complete Landing Page (`src/app/page.tsx`)

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `TaburMark`, `TaburWordmark`, `TaburLockup`, `HeroTreeScene` from `@/components/brand/tabur-brand`, `Reveal` and `NavAuthButton` from `@/components/landing/*`, `Button`, `Card`, `Badge`, `Separator` from `@/components/ui/*`.
- Produces: Complete static marketing landing page in `src/app/page.tsx`.

- [ ] **Step 1: Assemble all 8 sections in `src/app/page.tsx`**

Implement `src/app/page.tsx` with:
1. **Floating Navigation (`LandingNav`)**:
   - Fixed pill container with glassmorphism (`rgba(255,255,255,0.85)` + backdrop blur).
   - `TaburMark` icon on left.
   - Anchor links (`#program`, `#kajian`), `Separator`, `NavAuthButton`, and primary CTA button (`"Lihat Program"` $\to$ `#program`).
2. **Hero Section**:
   - 3 ambient blurred clouds (`.cloud .c1`, `.c2`, `.c3`).
   - Central `TaburWordmark` with optical bias +50.
   - Tagline: `<span className="hero-script">tadabbur, bersama</span><br/>Belajar memahami Qur’an dengan kaidah — bareng Ustadz Budi Ashari.`
   - Dual actions: Primary CTA (`"Ikut Kajian — Gratis"`, `#kajian`) + Secondary CTA (`"Lihat Program"`, `#program`).
   - Reassurance text: `"Kajian terbuka untuk umum — datang saja, tanpa syarat apa pun."`
   - Bottom `HeroTreeScene` with responsive center cropping.
3. **Video Section ("Apa Itu Tabur?")**:
   - `video-band` background (`--color-bg-band-kalem`).
   - Title & lead paragraph.
   - 16:9 responsive frame with centered play button SVG.
4. **Manifesto Section**:
   - 2-column grid (`.manifesto`).
   - Heading: `"Kenapa Tadabbur adalah satu-satunya pilihan untuk Memakmurkan bumi?"` with script highlights.
   - 2 narrative paragraphs.
5. **Kenapa Tabur Section**:
   - Split layout: Media placeholder (`"Foto: menabur benih"`) on left, heading with inline `TaburWordmark` on right.
   - Narrative on seed sowing metaphor.
6. **Sang Guru Section**:
   - Split reverse layout: 3:4 media placeholder (`"Foto: Ustadz Budi Ashari"`) on left, heading `"Ustadz Budi Ashari - Sang Guru"` on right.
7. **Program Section**:
   - Embun band background (`--color-embun`).
   - Eyebrow: `"Kelas Online — 1 Kaidah, 1 Season"`.
   - Title & Lead description.
   - 4-step steps rail (Langkah 1: Orientasi, Langkah 2: Menyimak, Langkah 3: Menulis & Setor, Langkah 4: Sertifikat). Responsive connected line.
   - Bottom CTA + static informative badge (`"Pendaftaran dibuka berkala — rombongan terbatas 300 kursi"`).
8. **Kajian Section**:
   - Eyebrow: `"Kajian Offline — Gratis"`.
   - Title: `"Rasakan Dulu Tadabburnya"`.
   - Feature card using `Card` + `Badge`: `"Kajian Tadabbur — Kaidah 1"`, `"Ahad, 19 Oktober · 08.00 WIB"`, `"Masjid Raya UB · tersedia Kids Corner"`, CTA chip `"Amankan kursi — gratis"`.
9. **Stats Ribbon**:
   - 3-column stats ribbon (`1 Season Berjalan`, `1.500 Peserta Kajian`, `200 Karya Tadabbur`).
10. **Footer**:
    - Dark background (`--color-bg-footer`).
    - `TaburLockup` brand mark & text.
    - Social links (Instagram, YouTube, WhatsApp SVG icons with `aria-label`).
    - Colophon: `"Tabur Bareng UB · Media 2Mimbar"`.

- [ ] **Step 2: Run typecheck and linter**

Run:
```bash
npm run lint && npm run typecheck
```
Expected: PASS with 0 errors or warnings.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: assemble complete rev 5.1 landing page with co-located sections"
```

---

### Task 6: Build Verification & Smoke Testing

**Files:**
- Test / Verify: Complete app build and local smoke endpoints

- [ ] **Step 1: Run production build**

Run:
```bash
npm run build
```
Verify:
1. Build compiles successfully with 0 errors.
2. Route list marks `/` as `○ (Static)`.
3. Route `/app`, `/tiket-saya`, `/admin` continue to compile properly.

- [ ] **Step 2: Smoke test production server**

1. Launch server via `hub` / background process.
2. Verify:
   - `curl -s http://localhost:3000/` contains `"TaburBarengUB"`, `"Apa Itu Tabur"`, `"Ustadz Budi Ashari"`, and `"1 Season Berjalan"`.
   - `curl -s http://localhost:3000/app` continues to return beranda app with `"Sesi Mendatang"`.
   - Browser check: Visual elements, layout responsiveness, and nav auth button behavior.

- [ ] **Step 3: Commit any adjustments & finalize**

```bash
git status
```
Ensure working tree is clean.
