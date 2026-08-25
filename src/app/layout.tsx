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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://taburbarengub.id'),
  title: 'Tabur Bareng UB — Tadabbur Bersama Ustadz Budi Ashari',
  description:
    "Belajar memahami Qur'an dengan kaidah tadabbur — bareng Ustadz Budi Ashari. Kajian offline gratis & kelas online per season.",
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    title: 'TaburBarengUB — Belajar Tadabbur, Selangkah demi Selangkah',
    description:
      "Belajar memahami Qur'an dengan kaidah tadabbur — bareng Ustadz Budi Ashari. Kajian offline gratis & kelas online per season.",
    siteName: 'TaburBarengUB',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TaburBarengUB — Belajar Tadabbur, Selangkah demi Selangkah',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaburBarengUB — Belajar Tadabbur, Selangkah demi Selangkah',
    description:
      "Belajar memahami Qur'an dengan kaidah tadabbur — bareng Ustadz Budi Ashari. Kajian offline gratis & kelas online per season.",
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
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
