import type { CSSProperties } from 'react'
import type { Database } from '@/lib/types/database.types'

type UserProfileRow = Database['public']['Tables']['users']['Row']

export type ProfileCompletionData = Pick<
  UserProfileRow,
  | 'nama'
  | 'nama_panggilan'
  | 'no_hp'
  | 'jenis_kelamin'
  | 'usia'
  | 'profesi'
  | 'domisili'
>
export type UserProfile = ProfileCompletionData

export type ProfileFormState = {
  nama: string
  nama_panggilan: string
  no_hp: string
  usia: string
  profesi: string
  domisili: string
}

export function createInitialState(profile: UserProfile | null): ProfileFormState {
  return {
    nama: profile?.nama ?? '',
    nama_panggilan: profile?.nama_panggilan ?? '',
    no_hp: profile?.no_hp ?? '',
    usia: profile?.usia ? String(profile.usia) : '',
    profesi: profile?.profesi ?? '',
    domisili: profile?.domisili ?? '',
  }
}

export const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  padding: 11,
  borderRadius: 10,
  border: '1px solid #d1d5db',
}

export const errorBoxStyle: CSSProperties = {
  padding: 14,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
  borderRadius: 12,
}

export function primaryButtonStyle(loading = false): CSSProperties {
  return {
    background: loading ? '#9ca3af' : '#111827',
    color: '#fff',
    border: 0,
    borderRadius: 10,
    padding: '11px 16px',
    fontWeight: 800,
    cursor: loading ? 'wait' : 'pointer',
  }
}

export type SubmitResult = { ok: true } | { ok: false; error: string }

export async function submitProfile(form: ProfileFormState): Promise<SubmitResult> {
  try {
    const response = await fetch('/api/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: form.nama,
        nama_panggilan: form.nama_panggilan,
        no_hp: form.no_hp,
        usia: Number(form.usia),
        profesi: form.profesi,
        domisili: form.domisili,
      }),
    })

    const result = (await response.json().catch(() => null)) as
      | { error?: unknown }
      | null

    if (!response.ok) {
      const error =
        typeof result?.error === 'string'
          ? result.error
          : 'Gagal menyimpan profil, coba lagi'
      return { ok: false, error }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Tidak bisa terhubung ke server, coba lagi' }
  }
}
