import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/server'
import { formatDateTimeCompact } from '@/lib/format'
import { getUser, type UserSummary } from '@/features/session/shared/participant'

type ParticipantBooking = {
  id: string
  status: string
  created_at: string
  checked_in_at: string | null
  users: UserSummary | UserSummary[] | null
}

function badgeStyle(status: string) {
  if (status === 'checked_in' || status === 'published') {
    return { background: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
  }

  if (status === 'cancelled') {
    return { background: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
  }

  if (status === 'online') {
    return { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
  }

  return { background: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
}

function Badge({ label, status }: { label: string; status: string }) {
  const style = badgeStyle(status)

  return (
    <span
      style={{
        display: 'inline-flex',
        borderRadius: 999,
        padding: '4px 9px',
        fontSize: 12,
        fontWeight: 800,
        textTransform: 'capitalize',
        background: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {label}
    </span>
  )
}

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session, error: sessionError } = await supabase
    .from('event_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (sessionError || !session) {
    notFound()
  }

  const { data: bookingsData, error: bookingsError } = await supabase
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
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })

  const bookings = (bookingsData ?? []) as unknown as ParticipantBooking[]
  const activeBookingCount = bookings.filter((booking) => booking.status !== 'cancelled').length
  const checkedInCount = bookings.filter((booking) => booking.status === 'checked_in').length
  const sisaKuota = Math.max(session.kapasitas - session.kuota_terisi, 0)

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <BackLink />
            <h1 style={{ fontSize: 34, marginTop: 16, letterSpacing: -0.8 }}>
              {session.nama_sesi}
            </h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <Badge label={session.status} status={session.status} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link
              href={`/admin/sesi/${session.id}/edit`}
              style={{
                background: '#111827',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: 10,
                fontWeight: 800,
              }}
            >
              Edit
            </Link>
            <Link
              href={`/sesi/${session.id}`}
              style={{
                background: '#ffffff',
                color: '#111827',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #d1d5db',
                fontWeight: 800,
              }}
            >
              Lihat Publik
            </Link>
          </div>
        </div>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 14, padding: 16 }}>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>Jadwal</p>
            <strong>{formatDateTimeCompact(session.tanggal_waktu)} WIB</strong>
          </div>
          <div style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 14, padding: 16 }}>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>Booking aktif</p>
            <strong>{activeBookingCount}</strong> / {session.kapasitas}
          </div>
          <div style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 14, padding: 16 }}>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>Checked-in</p>
            <strong>{checkedInCount}</strong>
          </div>
          <div style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 14, padding: 16 }}>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>Kids Corner</p>
            <strong>{session.kuota_kids_terisi}</strong> / {session.kapasitas_kids}
          </div>
          <div style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 14, padding: 16 }}>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>Sisa kursi</p>
            <strong>{sisaKuota}</strong>
          </div>
        </section>
        <section style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 16, padding: 18, marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, marginBottom: 10 }}>Informasi Sesi</h2>
          <div style={{ display: 'grid', gap: 8, color: '#4b5563', lineHeight: 1.6 }}>
            {session.lokasi_atau_link && <p><strong>Lokasi/Catatan:</strong> {session.lokasi_atau_link}</p>}
            {session.deskripsi && <p><strong>Deskripsi:</strong> {session.deskripsi}</p>}
            <p><strong>Kuota terisi sistem:</strong> {session.kuota_terisi} / {session.kapasitas}</p>
          </div>
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 24 }}>Peserta Sesi</h2>
              <p style={{ color: '#6b7280', marginTop: 4 }}>
                Daftar peserta yang booking sesi ini. Tampilan ini mobile-friendly.
              </p>
            </div>
            <a
              href={`/admin/peserta/export.csv?session_id=${session.id}`}
              style={{
                background: '#111827',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: 10,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              Export CSV
            </a>
          </div>

          {bookingsError && (
            <div role="alert" style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', padding: 16, borderRadius: 12 }}>
              Gagal memuat peserta sesi ini.
            </div>
          )}

          {!bookingsError && bookings.length === 0 && (
            <div style={{ border: '1px dashed #d1d5db', background: '#fff', padding: 24, borderRadius: 14 }}>
              Belum ada peserta yang booking sesi ini.
            </div>
          )}

          {bookings.length > 0 && (
            <div style={{ display: 'grid', gap: 12 }}>
              {bookings.map((booking) => {
                const participant = getUser(booking)

                return (
                  <article
                    key={booking.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      borderRadius: 16,
                      padding: 16,
                      minWidth: 0,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: 18, overflowWrap: 'anywhere' }}>{participant?.nama ?? 'Data user tidak ditemukan'}</h3>
                        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4, overflowWrap: 'anywhere' }}>ID booking: {booking.id}</p>
                      </div>
                      <Badge label={booking.status} status={booking.status} />
                    </div>

                    <div style={{ display: 'grid', gap: 6, color: '#4b5563', lineHeight: 1.6, minWidth: 0, overflowWrap: 'anywhere' }}>
                      <p><strong>No HP:</strong> {participant?.no_hp ?? '-'}</p>
                      <p><strong>Email:</strong> {participant?.email ?? '-'}</p>
                      <p><strong>Profesi:</strong> {participant?.profesi ?? '-'}</p>
                      <p><strong>Domisili:</strong> {participant?.domisili ?? '-'}</p>
                      <p><strong>Booking:</strong> {formatDateTimeCompact(booking.created_at)} WIB</p>
                      <p><strong>Check-in:</strong> {booking.checked_in_at ? `${formatDateTimeCompact(booking.checked_in_at)} WIB` : '-'}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
