import { notFound, redirect } from 'next/navigation'
import { BackLink } from '@/components/ui/back-link'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime } from '@/lib/format'
import { statusLabel, statusStyle } from '@/features/booking/shared/booking-status'
import { TicketQrCode } from '@/features/booking/client/ticket-qr-code'

type SessionSummary = {
  id: string
  nama_sesi: string
  tanggal_waktu: string
  lokasi_atau_link: string | null
  deskripsi: string | null
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, session_id, status, qr_token, created_at, checked_in_at, jumlah_anak')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (bookingError || !booking) {
    notFound()
  }

  const { data: session } = await supabase
    .from('event_sessions')
    .select('id, nama_sesi, tanggal_waktu, lokasi_atau_link, deskripsi')
    .eq('id', booking.session_id)
    .maybeSingle()
  const sessionData = session as SessionSummary | null
  const canShowQr = booking.status !== 'cancelled'

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <BackLink />

        <article
          style={{
            marginTop: 24,
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            borderRadius: 20,
            padding: 24,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              borderRadius: 999,
              padding: '5px 11px',
              fontSize: 12,
              fontWeight: 800,
              ...statusStyle(booking.status),
            }}
          >
            {statusLabel(booking.status)}
          </span>

          <h1 style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: -0.8, marginTop: 16 }}>
            {sessionData?.nama_sesi ?? 'Sesi tidak ditemukan'}
          </h1>

          {sessionData ? (
            <div style={{ color: '#4b5563', lineHeight: 1.7, marginTop: 16 }}>
              <p>{formatDateTime(sessionData.tanggal_waktu)} WIB</p>
              {sessionData.lokasi_atau_link && <p>{sessionData.lokasi_atau_link}</p>}
              {booking.jumlah_anak > 0 && (
                <p style={{ marginTop: 6, color: '#047857', fontWeight: 600 }}>
                  Kids Corner: {booking.jumlah_anak} anak
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: '#b91c1c', lineHeight: 1.6, marginTop: 16 }}>
              Data sesi tidak bisa dimuat. Hubungi panitia.
            </p>
          )}

          <section style={{ display: 'grid', justifyItems: 'center', gap: 14, marginTop: 28 }}>
            {canShowQr ? (
              <>
                <TicketQrCode value={booking.qr_token} />
                <div style={{ textAlign: 'center', color: '#4b5563', lineHeight: 1.6 }}>
                  <strong style={{ color: '#111827' }}>Tunjukkan QR ini ke staff saat masuk venue.</strong>
                  <p>Pastikan hanya satu QR ini yang terlihat saat discan agar tidak tertukar dengan tiket lain.</p>
                </div>
              </>
            ) : (
              <div
                style={{
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#991b1b',
                  padding: 16,
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                Tiket dibatalkan, QR tidak aktif.
              </div>
            )}
          </section>

          <dl style={{ display: 'grid', gap: 8, marginTop: 28, color: '#6b7280', fontSize: 13 }}>
            <div>
              <dt style={{ fontWeight: 800, color: '#374151' }}>Booking ID</dt>
              <dd style={{ wordBreak: 'break-word' }}>{booking.id}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 800, color: '#374151' }}>Waktu booking</dt>
              <dd>{formatDateTime(booking.created_at)} WIB</dd>
            </div>
            {booking.checked_in_at && (
              <div>
                <dt style={{ fontWeight: 800, color: '#047857' }}>Waktu check-in</dt>
                <dd>{formatDateTime(booking.checked_in_at)} WIB</dd>
              </div>
            )}
          </dl>
        </article>
      </div>
    </main>
  )
}
