'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { notifyRouteReplaced } from '@/lib/navigation/history-depth'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      // Pesan generik sengaja, jangan bocorin apakah email-nya
      // terdaftar atau nggak — itu celah buat orang enumerasi akun.
      setError('Email atau password salah')
      return
    }

    // replace, bukan push: form login yang sudah dilewati jangan sampai bisa
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
              Masuk
            </h1>
            <p style={{ color: '#6b7280', lineHeight: 1.6, marginTop: 8 }}>
              Masuk untuk booking seat dan membuka tiket QR kamu.
            </p>
          </div>

          <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 700 }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
            />
          </label>

          {error && (
            <div role="alert" style={{ padding: 14, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#9ca3af' : '#111827',
              color: '#fff',
              border: 0,
              borderRadius: 10,
              width: '100%',
              boxSizing: 'border-box',
              padding: '11px 16px',
              fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>

          <div style={{ display: 'grid', gap: 8, color: '#4b5563', lineHeight: 1.6 }}>
            <p>
              <Link href="/forgot-password" style={{ color: '#1d4ed8', fontWeight: 700 }}>
                Lupa password?
              </Link>
            </p>
            <p>
              Belum punya akun?{' '}
              <Link href="/register" style={{ color: '#1d4ed8', fontWeight: 700 }}>
                Daftar
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}
