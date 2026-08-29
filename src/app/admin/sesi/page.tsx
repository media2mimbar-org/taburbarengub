import Link from 'next/link'
import styles from './sesi.module.css'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/server'
import { formatDateTimeCompact } from '@/lib/format'

function statusStyle(status: string) {
  if (status === 'published') {
    return { background: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
  }

  if (status === 'cancelled') {
    return { background: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
  }

  return { background: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
}

export default async function AdminSesiPage() {
  const supabase = await createClient()

  const { data: sessions, error } = await supabase
    .from('event_sessions')
    .select('*')
    .order('tanggal_waktu', { ascending: true })

  const safeSessions = sessions ?? []

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'flex-start',
            marginBottom: 24,
          }}
        >
          <div>
            <BackLink />
            <h1 style={{ fontSize: 36, marginTop: 16, letterSpacing: -0.8 }}>Kelola Sesi Kajian</h1>
            <p style={{ color: '#6b7280', marginTop: 8 }}>
              Daftar semua sesi kajian offline. Kuota terisi dikelola otomatis oleh sistem booking.
            </p>
          </div>

          <Link
            href="/admin/sesi/new"
            style={{
              background: '#111827',
              color: '#fff',
              padding: '11px 15px',
              borderRadius: 10,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            + Tambah Sesi
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#991b1b',
              padding: 16,
              borderRadius: 12,
              marginBottom: 18,
            }}
          >
            Gagal memuat sesi. Pastikan akun kamu punya role admin.
          </div>
        )}

        {!error && safeSessions.length === 0 && (
          <div style={{ border: '1px dashed #d1d5db', background: '#fff', padding: 24, borderRadius: 14 }}>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Belum ada sesi</h2>
            <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
              Tambahkan sesi pertama supaya bisa tampil di landing page setelah statusnya published.
            </p>
          </div>
        )}

        {safeSessions.length > 0 && (
          <>
          <div className={styles.desktopOnly} style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Nama Sesi</th>
                  <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Tanggal</th>
                  <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Kursi Dewasa</th>
                  <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Kids Corner</th>
                  <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {safeSessions.map((session) => {
                  const sisaKuota = Math.max(session.kapasitas - session.kuota_terisi, 0)
                  const sisaKids = Math.max(session.kapasitas_kids - session.kuota_kids_terisi, 0)
                  const currentStatusStyle = statusStyle(session.status)

                  return (
                    <tr key={session.id}>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                        <strong>{session.nama_sesi}</strong>
                        {session.lokasi_atau_link && (
                          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{session.lokasi_atau_link}</p>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                        {formatDateTimeCompact(session.tanggal_waktu)} WIB
                      </td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                        <strong>{session.kuota_terisi}</strong> / {session.kapasitas}
                        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Sisa {sisaKuota}</p>
                      </td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                        <strong>{session.kuota_kids_terisi}</strong> / {session.kapasitas_kids}
                        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Sisa {sisaKids}</p>
                      </td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            borderRadius: 999,
                            padding: '4px 9px',
                            fontSize: 12,
                            fontWeight: 800,
                            textTransform: 'capitalize',
                            background: currentStatusStyle.background,
                            color: currentStatusStyle.color,
                            border: `1px solid ${currentStatusStyle.border}`,
                          }}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link href={`/admin/sesi/${session.id}`} style={{ color: '#1d4ed8', fontWeight: 800 }}>
                            Detail
                          </Link>
                          <Link href={`/admin/sesi/${session.id}/edit`} style={{ color: '#111827', fontWeight: 800 }}>
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileOnly}>
            <div className={styles.sessionCards}>
              {safeSessions.map((session) => {
                const sisaKuota = Math.max(session.kapasitas - session.kuota_terisi, 0)
                const sisaKids = Math.max(session.kapasitas_kids - session.kuota_kids_terisi, 0)
                const currentStatusStyle = statusStyle(session.status)

                return (
                  <article key={session.id} className={styles.sessionCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <h2 style={{ fontSize: 20, lineHeight: 1.3 }}>{session.nama_sesi}</h2>
                      <span
                        style={{
                          display: 'inline-flex',
                          borderRadius: 999,
                          padding: '4px 9px',
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: 'capitalize',
                          background: currentStatusStyle.background,
                          color: currentStatusStyle.color,
                          border: `1px solid ${currentStatusStyle.border}`,
                        }}
                      >
                        {session.status}
                      </span>
                    </div>

                    <div style={{ color: '#4b5563', lineHeight: 1.6 }}>
                      <p>{formatDateTimeCompact(session.tanggal_waktu)} WIB</p>
                      {session.lokasi_atau_link && <p>{session.lokasi_atau_link}</p>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                      <p style={{ color: '#374151' }}>
                        Kursi: <strong>{session.kuota_terisi}</strong>/{session.kapasitas} (Sisa {sisaKuota})
                      </p>
                      <p style={{ color: '#374151' }}>
                        Kids: <strong>{session.kuota_kids_terisi}</strong>/{session.kapasitas_kids} (Sisa {sisaKids})
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
                      <Link href={`/admin/sesi/${session.id}`} style={{ color: '#1d4ed8', fontWeight: 800 }}>
                        Detail
                      </Link>
                      <Link href={`/admin/sesi/${session.id}/edit`} style={{ color: '#111827', fontWeight: 800 }}>
                        Edit
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
          </>
        )}
      </div>
    </main>
  )
}
