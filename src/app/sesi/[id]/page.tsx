import Link from 'next/link'
import { BackLink } from '@/components/ui/back-link'
import { ProfileCompletionPrompt } from '@/features/profile/client/profile-completion-prompt'
import type { UserProfile } from '@/features/profile/shared/profile-form-shared'
import { BookingButton } from '@/features/booking/client/booking-button'
import { resolveBookingCta, type BookingCta } from '@/features/booking/shared/booking-cta'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileGate } from '@/features/profile/server/profile-service'
import { formatDateTime } from '@/lib/format'

const disabledButtonStyle = { padding: '12px 16px', borderRadius: 10 }

const ticketLinkStyle = {
  background: '#ecfdf5',
  color: '#047857',
  padding: '12px 16px',
  borderRadius: 10,
  fontWeight: 700,
  border: '1px solid #a7f3d0',
}

const primaryLinkStyle = {
  background: '#111827',
  color: '#fff',
  padding: '12px 16px',
  borderRadius: 10,
  fontWeight: 700,
}

function ticketLabel(cta: Extract<BookingCta, { tag: 'has_booking' }>) {
  if (cta.checkedIn) return 'Kamu sudah hadir — lihat tiket'
  if (cta.sessionPast) return 'Lihat tiket — sesi sudah selesai'
  return 'Kamu sudah booking — lihat tiket'
}

/**
 * Merender satu CTA sesuai keputusan resolveBookingCta().
 *
 * Semua cabang wajib ditangani: `default` menugaskan `cta` ke `never`, jadi
 * menambah varian BookingCta tanpa menambah case di sini gagal saat compile,
 * bukan diam-diam merender kosong seperti ternary sebelumnya.
 */
function BookingCtaAction({
  cta,
  sessionId,
  profile,
}: {
  cta: BookingCta
  sessionId: string
  profile: UserProfile | null
}) {
  switch (cta.tag) {
    case 'has_booking':
      return (
        <Link href={`/tiket-saya/${cta.bookingId}`} style={ticketLinkStyle}>
          {ticketLabel(cta)}
        </Link>
      )

    case 'cancelled':
      // Kalimat netral — pembatalan bisa datang dari admin, bukan cuma user.
      return (
        <button disabled style={disabledButtonStyle}>
          Booking dibatalkan
        </button>
      )

    case 'past':
      return (
        <button disabled style={disabledButtonStyle}>
          Sesi sudah selesai
        </button>
      )

    case 'full':
      return (
        <button disabled style={disabledButtonStyle}>
          Kuota penuh
        </button>
      )

    case 'needs_login':
      return (
        <Link href="/login" style={primaryLinkStyle}>
          Masuk untuk Booking
        </Link>
      )

    case 'profile_incomplete':
      return (
        <ProfileCompletionPrompt
          profile={profile}
          autoOpen={false}
          showDismissedBanner={false}
          triggerLabel="Lengkapi Profil untuk Booking"
        />
      )

    case 'unavailable':
      // Jangan menawarkan form di sini: kalau baris profilnya memang hilang,
      // complete_user_profile() pasti menolak dengan TB404.
      return (
        <div style={{ display: 'grid', gap: 8 }}>
          <button disabled style={disabledButtonStyle}>
            Booking belum tersedia
          </button>
          <p role="alert" style={{ color: '#b91c1c', lineHeight: 1.5 }}>
            Data profil gagal dimuat. Coba muat ulang halaman — kalau tetap
            gagal, hubungi panitia.
          </p>
        </div>
      )

    case 'can_book':
      return <BookingButton sessionId={sessionId} />

    default: {
      const unhandled: never = cta
      throw new Error(`CTA tidak tertangani: ${JSON.stringify(unhandled)}`)
    }
  }
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: session, error } = await supabase
    .from('event_sessions')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !session) {
    notFound()
  }

  const [{ data: existingBooking }, gate] = await Promise.all([
    user
      ? supabase
          .from('bookings')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('session_id', session.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getProfileGate(supabase, user?.id ?? null),
  ])

  // Satu `now` untuk seluruh render, supaya teks kuota dan CTA tidak bisa
  // menyimpulkan hal berbeda soal sesi yang tepat lewat saat request berjalan.
  const now = new Date()
  const sisaKuota = Math.max(session.kapasitas - session.kuota_terisi, 0)
  const isPast = new Date(session.tanggal_waktu) <= now

  const cta = resolveBookingCta({
    session,
    profileState: gate.tag,
    booking: existingBooking,
    now,
  })

  return (
    <main style={{ minHeight: '100vh', background: '#fafafa', color: '#171717' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <BackLink />

        <article
          style={{
            marginTop: 24,
            border: '1px solid #e5e7eb',
            borderRadius: 18,
            background: '#ffffff',
            padding: 28,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: '#6b7280', fontWeight: 700, marginBottom: 8 }}>
                Kajian Pembuka Offline
              </p>
              <h1 style={{ fontSize: 36, lineHeight: 1.1, letterSpacing: -0.8 }}>
                {session.nama_sesi}
              </h1>
            </div>
            <span
              style={{
                borderRadius: 999,
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 800,
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
              }}
            >
              OFFLINE
            </span>
          </div>

          <dl style={{ display: 'grid', gap: 16, marginTop: 28 }}>
            <div>
              <dt style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>Tanggal & waktu</dt>
              <dd style={{ marginTop: 4 }}>{formatDateTime(session.tanggal_waktu)} WIB</dd>
            </div>

            {session.lokasi_atau_link && (
              <div>
                <dt style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>
                  Lokasi Venue
                </dt>
                <dd style={{ marginTop: 4 }}>{session.lokasi_atau_link}</dd>
              </div>
            )}

            <div>
              <dt style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>Kuota Kursi</dt>
              <dd style={{ marginTop: 4 }}>
                {isPast
                  ? 'Sesi sudah selesai'
                  : `${sisaKuota} kursi tersisa dari ${session.kapasitas}`}
              </dd>
            </div>
            {session.kapasitas_kids > 0 && (
              <div>
                <dt style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>Kids Corner</dt>
                <dd style={{ marginTop: 4 }}>
                  {isPast
                    ? 'Sesi sudah selesai'
                    : `${Math.max(session.kapasitas_kids - session.kuota_kids_terisi, 0)} kuota anak tersisa dari ${session.kapasitas_kids}`}
                </dd>
              </div>
            )}
          </dl>
          {session.deskripsi && (
            <section style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>Deskripsi</h2>
              <p style={{ color: '#4b5563', lineHeight: 1.8 }}>{session.deskripsi}</p>
            </section>
          )}
          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <BookingCtaAction
              cta={cta}
              sessionId={session.id}
              profile={gate.tag === 'incomplete' ? gate.profile : null}
            />
          </div>
        </article>
      </div>
    </main>
  )
}
