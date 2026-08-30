import { redirect } from 'next/navigation'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { SessionForm } from '@/features/session/client/session-form'

export default async function NewSessionPage() {
  const supabase = await createClient()

  try {
    await requireAdmin(supabase)
  } catch {
    redirect('/admin')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
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
          <h1 style={{ fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Tambah Sesi</h1>
          <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
            Buat sesi baru. Gunakan status draft dulu jika informasi belum final.
          </p>

          <SessionForm />
        </section>
      </div>
    </main>
  )
}
