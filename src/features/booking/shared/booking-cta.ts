/**
 * Menentukan CTA apa yang tampil di halaman detail sesi.
 *
 * Dipisah dari page.tsx supaya urutan prioritasnya eksplisit dan bisa diuji
 * tanpa render — di JSX urutan itu cuma tersirat dari posisi ternary.
 */

export type BookingStatus = 'booked' | 'checked_in' | 'cancelled'

export type BookingCta =
  /** Sesi sudah lewat tanggalnya. */
  | { tag: 'past' }
  /** kuota_terisi >= kapasitas. */
  | { tag: 'full' }
  /**
   * User punya booking aktif. `checkedIn` dan `sessionPast` cuma membedakan
   * label, tujuan link-nya tetap sama (halaman tiket).
   */
  | { tag: 'has_booking'; bookingId: string; checkedIn: boolean; sessionPast: boolean }
  /**
   * Booking user untuk sesi ini berstatus dibatalkan.
   */
  | { tag: 'cancelled'; bookingId: string }
  /** Sudah login, tapi profile_completed = false. Booking akan ditolak TB106. */
  | { tag: 'profile_incomplete' }
  /** Boleh booking sekarang. */
  | { tag: 'can_book' }
  /** Belum login. */
  | { tag: 'needs_login' }
  /**
   * Profil tidak bisa dipastikan — query error, atau barisnya tidak ada.
   */
  | { tag: 'unavailable' }

export type BookingCtaInput = {
  session: {
    tanggal_waktu: string
    kapasitas: number
    kuota_terisi: number
  }
  profileState: 'anonymous' | 'unavailable' | 'incomplete' | 'complete'
  booking: { id: string; status: string } | null
  now: Date
}

export function resolveBookingCta(input: BookingCtaInput): BookingCta {
  const { session, profileState, booking, now } = input

  const isPast = new Date(session.tanggal_waktu) <= now
  const isFull = session.kuota_terisi >= session.kapasitas

  // 1. Relasi user
  if (booking !== null && booking.status !== 'cancelled') {
    return {
      tag: 'has_booking',
      bookingId: booking.id,
      checkedIn: booking.status === 'checked_in',
      sessionPast: isPast,
    }
  }

  if (booking !== null) {
    return { tag: 'cancelled', bookingId: booking.id }
  }

  // 2. Gerbang sesi
  if (isPast) return { tag: 'past' }
  if (isFull) return { tag: 'full' }

  // 3. Syarat bertindak
  if (profileState === 'anonymous') return { tag: 'needs_login' }
  if (profileState === 'unavailable') return { tag: 'unavailable' }
  if (profileState === 'incomplete') return { tag: 'profile_incomplete' }

  return { tag: 'can_book' }
}
