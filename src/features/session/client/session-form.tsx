'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import type { EventSession } from '@/features/session/shared/session.schema'

type SessionFormState = {
  nama_sesi: string
  tanggal_waktu: string
  lokasi_atau_link: string
  deskripsi: string
  kapasitas: string
  kapasitas_kids: string
  status: 'draft' | 'published' | 'cancelled'
  kloter_id: string
}

function toDateTimeLocal(value: string) {
  const date = new Date(value)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function createInitialState(session?: EventSession): SessionFormState {
  return {
    nama_sesi: session?.nama_sesi ?? '',
    tanggal_waktu: session ? toDateTimeLocal(session.tanggal_waktu) : '',
    lokasi_atau_link: session?.lokasi_atau_link ?? '',
    deskripsi: session?.deskripsi ?? '',
    kapasitas: String(session?.kapasitas ?? 60),
    kapasitas_kids: String(session?.kapasitas_kids ?? 0),
    status:
      session?.status === 'published' || session?.status === 'cancelled'
        ? session.status
        : 'draft',
    kloter_id: session?.kloter_id ?? '',
  }
}

export function SessionForm({ session }: { session?: EventSession }) {
  const router = useRouter()
  const [form, setForm] = useState<SessionFormState>(() => createInitialState(session))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(session)
  const kuotaTerisi = session?.kuota_terisi ?? 0
  const kuotaKidsTerisi = session?.kuota_kids_terisi ?? 0

  function updateField<K extends keyof SessionFormState>(field: K, value: SessionFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const kapasitas = Number(form.kapasitas)
    const kapasitasKids = Number(form.kapasitas_kids)

    if (!form.nama_sesi.trim()) {
      setError('Nama sesi wajib diisi')
      return
    }

    if (!form.tanggal_waktu) {
      setError('Tanggal dan waktu wajib diisi')
      return
    }

    if (!Number.isInteger(kapasitas) || kapasitas <= 0) {
      setError('Kapasitas harus berupa angka lebih dari 0')
      return
    }

    if (!Number.isInteger(kapasitasKids) || kapasitasKids < 0) {
      setError('Kapasitas Kids Corner harus berupa angka 0 atau lebih')
      return
    }

    if (isEditing && kapasitas < kuotaTerisi) {
      setError(`Kapasitas tidak boleh lebih kecil dari kuota terisi saat ini (${kuotaTerisi})`)
      return
    }

    if (isEditing && kapasitasKids < kuotaKidsTerisi) {
      setError(`Kapasitas Kids Corner tidak boleh lebih kecil dari kuota terisi saat ini (${kuotaKidsTerisi})`)
      return
    }

    setLoading(true)

    const payload = {
      nama_sesi: form.nama_sesi.trim(),
      tanggal_waktu: new Date(form.tanggal_waktu).toISOString(),
      lokasi_atau_link: emptyToNull(form.lokasi_atau_link),
      deskripsi: emptyToNull(form.deskripsi),
      kapasitas,
      kapasitas_kids: kapasitasKids,
      status: form.status,
      kloter_id: emptyToNull(form.kloter_id),
    }

    try {
      const response = await fetch(
        isEditing ? `/api/admin/sessions/${session!.id}` : '/api/admin/sessions',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const result = (await response.json().catch(() => null)) as
        | { error?: unknown }
        | null

      if (!response.ok) {
        const message =
          typeof result?.error === 'string'
            ? result.error
            : 'Gagal menyimpan sesi, coba lagi'
        setError(message)
        return
      }

      router.push('/admin/sesi')
      router.refresh()
    } catch {
      setError('Tidak bisa terhubung ke server, coba lagi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontWeight: 700 }}>Nama Sesi Kajian</span>
        <input
          value={form.nama_sesi}
          onChange={(event) => updateField('nama_sesi', event.target.value)}
          required
          style={{ padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Status</span>
          <select
            value={form.status}
            onChange={(event) => updateField('status', event.target.value as SessionFormState['status'])}
            style={{ padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Tanggal & Waktu</span>
          <input
            type="datetime-local"
            value={form.tanggal_waktu}
            onChange={(event) => updateField('tanggal_waktu', event.target.value)}
            required
            style={{ padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
          />
        </label>
      </div>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontWeight: 700 }}>Lokasi / Alamat Venue</span>
        <input
          value={form.lokasi_atau_link}
          onChange={(event) => updateField('lokasi_atau_link', event.target.value)}
          placeholder="Contoh: Masjid Raden Patah UB / Gedung Widyaloka"
          style={{ padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontWeight: 700 }}>Deskripsi</span>
        <textarea
          value={form.deskripsi}
          onChange={(event) => updateField('deskripsi', event.target.value)}
          rows={5}
          style={{ padding: 11, borderRadius: 10, border: '1px solid #d1d5db', resize: 'vertical' }}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Kapasitas Kursi Dewasa</span>
          <input
            type="number"
            min={Math.max(1, kuotaTerisi)}
            value={form.kapasitas}
            onChange={(event) => updateField('kapasitas', event.target.value)}
            required
            style={{ padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
          />
          <span style={{ color: '#6b7280', fontSize: 13 }}>
            Terisi: {kuotaTerisi} kursi
          </span>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Kapasitas Kids Corner</span>
          <input
            type="number"
            min={Math.max(0, kuotaKidsTerisi)}
            value={form.kapasitas_kids}
            onChange={(event) => updateField('kapasitas_kids', event.target.value)}
            required
            style={{ padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
          />
          <span style={{ color: '#6b7280', fontSize: 13 }}>
            Terisi: {kuotaKidsTerisi} anak
          </span>
        </label>
      </div>

      {error && (
        <div role="alert" style={{ padding: 14, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? '#9ca3af' : '#111827',
            color: '#fff',
            border: 0,
            borderRadius: 10,
            padding: '11px 16px',
            fontWeight: 800,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Sesi'}
        </button>
      </div>
    </form>
  )
}
