import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileGate } from '@/features/profile/server/profile-service'
import { CompleteProfileForm } from '@/features/profile/client/complete-profile-form'

export default async function CompleteProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const gate = await getProfileGate(supabase, user.id)

  if (gate.tag === 'complete') {
    redirect('/app')
  }

  // Formnya tidak akan berhasil kalau profil tak bisa dipastikan:
  // complete_user_profile() melakukan UPDATE, bukan UPSERT, jadi baris yang
  // hilang selalu berujung TB404. Tampilkan sebabnya, bukan form buntu.
  if (gate.tag === 'unavailable') {
    return (
      <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px' }}>
          <div
            role="alert"
            style={{
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#991b1b',
              padding: 24,
              borderRadius: 14,
              lineHeight: 1.7,
            }}
          >
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>Data profil tidak bisa dimuat</h1>
            <p>
              {gate.reason === 'query_failed'
                ? 'Terjadi gangguan saat membaca data profilmu. Coba muat ulang halaman ini.'
                : 'Data peserta untuk akun ini tidak ditemukan, jadi formnya belum bisa dipakai. Hubungi panitia untuk dipulihkan.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const profile = gate.profile

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px' }}>
        <section
          style={{
            display: 'grid',
            gap: 18,
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            borderRadius: 18,
            padding: 24,
            boxShadow: '0 10px 30px rgba(17, 24, 39, 0.06)',
            boxSizing: 'border-box',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#047857', fontWeight: 800, marginBottom: 12 }}>
              <span aria-hidden="true">✓</span>
              <span>Akun berhasil dibuat</span>
            </div>
            <h1 style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: -0.8 }}>
              Selamat datang di TaburBarengUB
            </h1>
            <h2 style={{ fontSize: 22, lineHeight: 1.3, marginTop: 22 }}>
              Lengkapi profil peserta
            </h2>
            <div style={{ display: 'grid', gap: 10, color: '#6b7280', lineHeight: 1.7, marginTop: 10 }}>
              <p>
                Lengkapi profilmu untuk melakukan booking sesi. Setelah booking berhasil,
                tiket QR akan tersedia untuk proses check-in saat acara.
              </p>
              <p>
                Informasi ini juga membantu panitia memahami profil peserta dan menyusun
                program yang lebih relevan.
              </p>
              <p style={{ color: '#374151', fontWeight: 700 }}>
                Data pribadimu tidak ditampilkan kepada publik.
              </p>
            </div>
          </div>

          <CompleteProfileForm profile={profile} />
        </section>
      </div>
    </main>
  )
}
