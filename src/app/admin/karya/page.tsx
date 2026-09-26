import { redirect } from 'next/navigation'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/server'
import { requireMentorOrAdmin } from '@/lib/auth/require-admin'

export default async function AdminKaryaPage() {
  const supabase = await createClient()

  try {
    await requireMentorOrAdmin(supabase)
  } catch {
    redirect('/admin')
  }

  // Naskah masuk; "dinilai" = ada baris penilaian_naskah (hanya terbaca penilai).
  const { data: submissions } = await supabase
    .from('writing_submissions')
    .select('id, user_id, kloter_id, versi, created_at, file_url, penilaian_naskah(submission_id)')
    .order('created_at', { ascending: false })

  const list = submissions ?? []

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px 80px' }}>
        <BackLink />

        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, letterSpacing: -0.8, marginBottom: 6 }}>
            Baca & Nilai Karya
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.5 }}>
            Panel mentor untuk membaca naskah tugas tadabbur kloter dan memberikan penilaian.
          </p>
        </div>

        {list.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              color: '#6b7280',
            }}
          >
            Belum ada naskah yang disetor oleh peserta.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {list.map((sub) => {
              const dinilai = sub.penilaian_naskah !== null
              return (
                <article
                  key={sub.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 14,
                    padding: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                      Versi {sub.versi}
                    </h3>
                  </div>
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      background: dinilai ? '#ecfdf5' : '#fef3c7',
                      color: dinilai ? '#047857' : '#b45309',
                    }}
                  >
                    {dinilai ? 'Selesai Dinilai' : 'Menunggu Penilaian'}
                  </span>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
