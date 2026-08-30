import { notFound, redirect } from 'next/navigation'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { SessionForm } from '@/features/session/client/session-form'
export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  try {
    await requireAdmin(supabase)
  } catch {
    redirect('/admin')
  }
  const { data: session, error } = await supabase
    .from('event_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !session) {
    notFound()
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
          <h1 style={{ fontSize: 32, letterSpacing: -0.8, marginBottom: 8 }}>Edit Sesi</h1>
          <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
            Ubah informasi sesi. Kuota terisi tidak bisa diedit manual.
          </p>

          <SessionForm session={session} />
        </section>
      </div>
    </main>
  )
}
