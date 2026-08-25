// Satu-satunya sumber kebenaran untuk tujuan tombol "Kembali".
//
// Semantiknya "Up", bukan "Back": tujuan ditentukan hierarki route, bukan
// history browser. Dipilih karena banyak halaman app ini punya entry point
// tanpa history dalam-app (link tiket di-share, QR discan, bookmark admin
// scanner) — di kasus itu back beneran malah keluar dari app.

// Label diturunkan dari route TUJUAN, bukan route asal. Kalau nanti '/admin'
// mau disebut 'dashboard', ganti sekali di sini.
const PARENT_LABELS = {
  '/': 'landing page',
  '/app': 'beranda',
  '/login': 'login',
  '/admin': 'admin',
  '/admin/sesi': 'daftar sesi',
  '/tiket-saya': 'Tiket Saya',
} as const

type ParentHref = keyof typeof PARENT_LABELS

// Value di-type ParentHref, jadi compiler nolak parent yang labelnya belum
// terdaftar di atas. Segmen dinamis pakai notasi folder Next.js ('[id]')
// supaya peta ini kebaca sejajar dengan struktur app/.
const PARENT_ROUTES: Record<string, ParentHref> = {
  '/login': '/',
  '/register': '/',
  // Pengecualian yang disengaja: parent URL-nya '/', tapi parent alur kerjanya
  // '/login' — user nyampe sini dari form login, bukan dari landing.
  '/tiket-saya': '/app',
  '/tiket-saya/[id]': '/tiket-saya',
  '/sesi/[id]': '/app',
  // '/logout' sengaja nggak didaftarin: link "Kembali ke landing page" di situ
  // adalah CTA pemulihan kalau logout gagal, bukan back-chrome.
  '/admin': '/app',
  '/admin/hero': '/admin',
  '/admin/sesi': '/admin',
  '/admin/sesi/new': '/admin/sesi',
  '/admin/sesi/[id]': '/admin/sesi',
  '/admin/sesi/[id]/edit': '/admin/sesi',
  '/admin/peserta': '/admin',
  '/admin/scanner': '/admin',
}

export type ParentRoute = { href: ParentHref; label: string }

function matchesPattern(pathname: string, pattern: string): boolean {
  const pathSegments = pathname.split('/')
  const patternSegments = pattern.split('/')

  if (pathSegments.length !== patternSegments.length) return false

  return patternSegments.every((segment, i) => {
    if (segment.startsWith('[') && segment.endsWith(']')) {
      // Segmen dinamis cocok dengan apa pun kecuali string kosong — '/sesi/'
      // jangan sampai kebaca sebagai '/sesi/[id]'.
      return pathSegments[i].length > 0
    }
    return segment === pathSegments[i]
  })
}

export function resolveParentRoute(pathname: string): ParentRoute | null {
  // Literal dulu, supaya '/admin/sesi/new' menang atas '/admin/sesi/[id]' —
  // keduanya cocok, yang statis lebih spesifik.
  const exact = PARENT_ROUTES[pathname]
  if (exact) return { href: exact, label: PARENT_LABELS[exact] }

  const pattern = Object.keys(PARENT_ROUTES).find(
    (candidate) => candidate.includes('[') && matchesPattern(pathname, candidate)
  )
  if (!pattern) return null

  const href = PARENT_ROUTES[pattern]
  return { href, label: PARENT_LABELS[href] }
}
