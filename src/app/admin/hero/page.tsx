import { redirect } from 'next/navigation'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { HeroForm } from '@/features/hero/client/hero-form'

export default async function AdminHeroPage() {
  const supabase = await createClient()

  try {
    await requireAdmin(supabase)
  } catch {
    redirect('/admin')
  }

  const { data: hero } = await supabase
    .from('hero_content')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 80px' }}>
        <BackLink />
        <section
          style={{
            marginTop: 24,
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            borderRadius: 18,
            padding: 24,
          }}
        >
          <h1 style={{ fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>
            Konten Landing Page
          </h1>
          <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
            Edit konten hero global: judul, filosofi, tagline, profil pemateri, dan foto.
            Daftar sesi tetap dikelola dari menu Kelola Sesi.
          </p>

          <HeroForm hero={hero} />
        </section>
      </div>
    </main>
  )
}
