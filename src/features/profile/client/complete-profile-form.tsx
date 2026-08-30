'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import {
  createInitialState,
  errorBoxStyle,
  inputStyle,
  primaryButtonStyle,
  submitProfile,
  type ProfileFormState,
  type UserProfile,
} from '@/features/profile/shared/profile-form-shared'

export function CompleteProfileForm({
  profile,
  submitLabel = 'Simpan & Lihat Sesi',
  redirectTo = '/app#sesi',
  onSuccess,
}: {
  profile: UserProfile | null
  submitLabel?: string
  redirectTo?: string
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<ProfileFormState>(() => createInitialState(profile))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField(field: keyof ProfileFormState) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!form.nama.trim()) {
      setError('Nama lengkap wajib diisi')
      return
    }

    if (!form.no_hp.trim()) {
      setError('No. HP wajib diisi')
      return
    }

    if (form.tanggal_lahir && !/^\d{4}-\d{2}-\d{2}$/.test(form.tanggal_lahir)) {
      setError('Format tanggal lahir tidak valid')
      return
    }

    if (!form.profesi.trim()) {
      setError('Profesi wajib diisi')
      return
    }

    if (!form.domisili.trim()) {
      setError('Domisili wajib diisi')
      return
    }

    setLoading(true)

    const result = await submitProfile(form)

    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (onSuccess) {
      onSuccess()
    } else {
      router.push(redirectTo)
    }
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 700 }}>Nama Lengkap</span>
          <input
            value={form.nama}
            onChange={updateField('nama')}
            autoComplete="name"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 700 }}>Nama Panggilan</span>
          <input
            value={form.nama_panggilan}
            onChange={updateField('nama_panggilan')}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 700 }}>No. HP</span>
          <input
            value={form.no_hp}
            onChange={updateField('no_hp')}
            inputMode="tel"
            autoComplete="tel"
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 700 }}>Tanggal Lahir</span>
          <input
            type="date"
            value={form.tanggal_lahir}
            onChange={updateField('tanggal_lahir')}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 700 }}>Profesi</span>
          <input
            value={form.profesi}
            onChange={updateField('profesi')}
            required
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 700 }}>Domisili</span>
          <input
            value={form.domisili}
            onChange={updateField('domisili')}
            required
            style={inputStyle}
          />
        </label>
      </div>

      {error && (
        <div role="alert" style={errorBoxStyle}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{ ...primaryButtonStyle(loading), width: '100%', boxSizing: 'border-box' }}
      >
        {loading ? 'Menyimpan...' : submitLabel}
      </button>
    </form>
  )
}
