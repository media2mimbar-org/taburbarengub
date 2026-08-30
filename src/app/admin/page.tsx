import Link from 'next/link'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/server'

type MenuItem = {
  href: string
  title: string
  description: string
  roles: Array<'admin' | 'staff' | 'mentor'>
}

const menuItems: MenuItem[] = [
  {
    href: '/admin/sesi',
    title: 'Kelola Sesi',
    description: 'Lihat daftar sesi, status publikasi, dan kuota peserta.',
    roles: ['admin'],
  },
  {
    href: '/admin/hero',
    title: 'Konten Landing',
    description: 'Edit judul, filosofi, tagline, dan profil pemateri di landing page.',
    roles: ['admin'],
  },
  {
    href: '/admin/scanner',
    title: 'Scan QR',
    description: 'Tool staff untuk check-in peserta di venue.',
    roles: ['admin', 'staff'],
  },
  {
    href: '/admin/peserta',
    title: 'Daftar Peserta',
    description: 'Lihat peserta per sesi dan status check-in.',
    roles: ['admin'],
  },
  {
    href: '/admin/karya',
    title: 'Baca & Nilai Karya',
    description: 'Panel peninjauan dan penilaian naskah kloter oleh mentor.',
    roles: ['admin', 'mentor'],
  },
]

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('users').select('role').eq('id', user.id).single()
    : { data: null }

  const role = (profile?.role as 'admin' | 'staff' | 'mentor' | undefined) ?? 'admin'
  const visibleItems = menuItems.filter((item) => item.roles.includes(role))
  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <BackLink />
            <h1 style={{ fontSize: 36, marginTop: 16, letterSpacing: -0.8 }}>Admin Dashboard</h1>
            <p style={{ color: '#6b7280', marginTop: 8 }}>
              Panel awal untuk mengelola sesi, peserta, dan check-in event.
            </p>
          </div>
          <Link
            href="/logout"
            style={{
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              padding: '10px 14px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            Keluar
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {visibleItems.map((item) => {
            const card = (
              <article
                style={{
                  height: '100%',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <h2 style={{ fontSize: 22, marginBottom: 8 }}>{item.title}</h2>
                <p style={{ color: '#6b7280', lineHeight: 1.6 }}>{item.description}</p>
              </article>
            )

            return (
              <Link key={item.href} href={item.href} style={{ display: 'block' }}>
                {card}
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
