import Link from 'next/link'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/server'
import { formatDateTimeCompact } from '@/lib/format'
import { getUser, type UserSummary } from '@/features/session/shared/participant'

type SearchParams = {
  session_id?: string
}

type ParticipantBooking = {
  id: string
  status: string
  created_at: string
  checked_in_at: string | null
  users: UserSummary | UserSummary[] | null
}

function getStatusStyle(status: string) {
  if (status === 'checked_in') {
    return { background: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
  }

  if (status === 'cancelled') {
    return { background: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
  }

  return { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
}

export default async function AdminPesertaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { session_id: sessionIdFromQuery } = await searchParams
  const supabase = await createClient()

  const { data: sessions, error: sessionsError } = await supabase
    .from('event_sessions')
    .select('id, nama_sesi, tanggal_waktu, status, kapasitas, kuota_terisi, kapasitas_kids, kuota_kids_terisi')
    .order('tanggal_waktu', { ascending: true })

  const safeSessions = sessions ?? []
  const selectedSessionId =
    safeSessions.find((session) => session.id === sessionIdFromQuery)?.id ?? safeSessions[0]?.id ?? ''
  const selectedSession = safeSessions.find((session) => session.id === selectedSessionId) ?? null

  const { data: bookingsData, error: bookingsError } = selectedSessionId
    ? await supabase
        .from('bookings')
        .select(
          `
          id,
          status,
          created_at,
          checked_in_at,
          users (
            nama,
            email,
            no_hp,
            profesi,
            domisili
          )
        `
        )
        .eq('session_id', selectedSessionId)
        .order('created_at', { ascending: true })
    : { data: [], error: null }

  const bookings = (bookingsData ?? []) as unknown as ParticipantBooking[]
  const checkedInCount = bookings.filter((booking) => booking.status === 'checked_in').length
  const activeBookingCount = bookings.filter((booking) => booking.status !== 'cancelled').length

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
            <h1 style={{ fontSize: 36, marginTop: 16, letterSpacing: -0.8 }}>Daftar Peserta</h1>
            <p style={{ color: '#6b7280', marginTop: 8 }}>
              Lihat peserta per sesi beserta status booking dan check-in.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {selectedSessionId && (
              <a
                href={`/admin/peserta/export.csv?session_id=${selectedSessionId}`}
                style={{
                  background: '#111827',
                  color: '#fff',
                  padding: '11px 15px',
                  borderRadius: 10,
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                Export CSV
              </a>
            )}
            <Link
              href="/admin/sesi"
              style={{
                background: '#ffffff',
                color: '#111827',
                padding: '11px 15px',
                borderRadius: 10,
                border: '1px solid #d1d5db',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              Kelola Sesi
            </Link>
          </div>
        </div>

        {sessionsError && (
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
            Gagal memuat daftar sesi. Pastikan akun kamu punya role admin.
          </div>
        )}

        {!sessionsError && safeSessions.length === 0 && (
          <div style={{ border: '1px dashed #d1d5db', background: '#fff', padding: 24, borderRadius: 14 }}>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Belum ada sesi</h2>
            <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>
              Tambahkan sesi dulu sebelum melihat daftar peserta.
            </p>
            <Link
              href="/admin/sesi/new"
              style={{
                display: 'inline-block',
                background: '#111827',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              Tambah Sesi
            </Link>
          </div>
        )}

        {safeSessions.length > 0 && (
          <>
            <form
              method="get"
              style={{
                display: 'grid',
                gap: 10,
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                borderRadius: 16,
                padding: 18,
                marginBottom: 18,
              }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 800 }}>Pilih Sesi</span>
                <select
                  name="session_id"
                  defaultValue={selectedSessionId}
                  style={{ padding: 11, borderRadius: 10, border: '1px solid #d1d5db' }}
                >
                  {safeSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.nama_sesi} — {formatDateTimeCompact(session.tanggal_waktu)} WIB
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <button
                  type="submit"
                  style={{
                    background: '#111827',
                    color: '#fff',
                    border: 0,
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontWeight: 800,
                  }}
                >
                  Tampilkan Peserta
                </button>
              </div>
            </form>

            {selectedSession && (
              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 14, padding: 16 }}>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>Sesi</p>
                  <strong>{selectedSession.nama_sesi}</strong>
                </div>
                <div style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 14, padding: 16 }}>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>Booking aktif</p>
                  <strong>{activeBookingCount}</strong> / {selectedSession.kapasitas}
                </div>
                <div style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 14, padding: 16 }}>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>Checked-in</p>
                  <strong>{checkedInCount}</strong>
                </div>
                <div style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 14, padding: 16 }}>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>Status sesi</p>
                  <strong style={{ textTransform: 'capitalize' }}>{selectedSession.status}</strong>
                </div>
              </section>
            )}

            {bookingsError && (
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
                Gagal memuat peserta sesi ini.
              </div>
            )}

            {!bookingsError && bookings.length === 0 && (
              <div style={{ border: '1px dashed #d1d5db', background: '#fff', padding: 24, borderRadius: 14 }}>
                Belum ada peserta yang booking sesi ini.
              </div>
            )}

            {bookings.length > 0 && (
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                      <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Peserta</th>
                      <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Kontak</th>
                      <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Profil</th>
                      <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                      <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Booking</th>
                      <th style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => {
                      const user = getUser(booking)
                      const statusStyle = getStatusStyle(booking.status)

                      return (
                        <tr key={booking.id}>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                            <strong>{user?.nama ?? 'Data user tidak ditemukan'}</strong>
                            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>ID booking: {booking.id}</p>
                          </td>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                            <p>{user?.no_hp ?? '-'}</p>
                            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{user?.email ?? '-'}</p>
                          </td>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                            <p>{user?.profesi ?? '-'}</p>
                            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{user?.domisili ?? '-'}</p>
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
                                background: statusStyle.background,
                                color: statusStyle.color,
                                border: `1px solid ${statusStyle.border}`,
                              }}
                            >
                              {booking.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                            {formatDateTimeCompact(booking.created_at)} WIB
                          </td>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                            {booking.checked_in_at ? `${formatDateTimeCompact(booking.checked_in_at)} WIB` : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
