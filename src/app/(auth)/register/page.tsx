'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { notifyRouteReplaced } from '@/lib/navigation/history-depth'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sama')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (!data.session) {
      setSubmitted(true)
      return
    }

    window.sessionStorage.setItem('taburbarengub.profileOnboardingMode', 'welcome')
    window.sessionStorage.removeItem('taburbarengub.profilePromptDismissed')
    // replace, bukan push: form register yang sudah dilewati jangan sampai bisa
    // dicapai lagi lewat tombol back.
    notifyRouteReplaced()
    router.replace('/app')
    router.refresh()
  }

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '64px 20px' }}>
        <form
          onSubmit={handleSubmit}
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
            <BackLink style={{ fontSize: 14 }} />
            <h1 style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: -0.8, marginTop: 18 }}>
              Buat Akun
            </h1>
            <p style={{ color: '#6b7280', lineHeight: 1.6, marginTop: 8 }}>
              Masukkan email dan password. Setelah akun berhasil dibuat, kamu akan masuk ke halaman utama dan melengkapi profil peserta sebelum booking sesi.
            </p>
          </div>

          <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 700 }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 700 }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 700 }}>Konfirmasi Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
            />
          </label>

          {submitted && (
            <div role="status" style={{ padding: 14, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', borderRadius: 12, lineHeight: 1.6 }}>
              Akun berhasil dibuat. Cek email untuk verifikasi, lalu login dan lengkapi profil.
            </div>
          )}

          {error && (
            <div role="alert" style={{ padding: 14, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || submitted}
            style={{
              background: loading || submitted ? '#9ca3af' : '#111827',
              color: '#fff',
              border: 0,
              borderRadius: 10,
              width: '100%',
              boxSizing: 'border-box',
              padding: '11px 16px',
              fontWeight: 800,
              cursor: loading || submitted ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Memproses...' : submitted ? 'Akun dibuat' : 'Buat Akun'}
          </button>

          <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
            Sudah punya akun?{' '}
            <Link href="/login" style={{ color: '#1d4ed8', fontWeight: 700 }}>
              Masuk
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
