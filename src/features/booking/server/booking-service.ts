import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

type Booking = Database['public']['Tables']['bookings']['Row']

export class BookingError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
  }
}

const PETA_ERROR: Record<string, { pesan: string; status: number }> = {
  '28000': { pesan: 'Kamu harus login dulu', status: 401 },
  TB101: { pesan: 'Sesi tidak ditemukan', status: 404 },
  TB102: { pesan: 'Sesi online belum bisa dibooking di Fase 1', status: 403 },
  TB103: { pesan: 'Kuota sesi ini sudah penuh', status: 409 },
  TB104: { pesan: 'Sesi ini sudah lewat', status: 409 },
  TB105: { pesan: 'Kamu sudah booking sesi ini sebelumnya', status: 409 },
  TB106: { pesan: 'Lengkapi profil kamu dulu sebelum booking', status: 403 },
  TB107: { pesan: 'Jumlah anak harus antara 0 sampai 5', status: 400 },
  TB108: { pesan: 'Kuota Kids Corner untuk sesi ini sudah penuh', status: 409 },
}

export async function createBooking(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  jumlahAnak: number = 0
): Promise<Booking> {
  const { data, error } = await supabase
    .rpc('create_booking', {
      p_session_id: sessionId,
      p_jumlah_anak: jumlahAnak,
    })
    .single()

  if (error) {
    const dikenal = error.code ? PETA_ERROR[error.code] : undefined

    if (dikenal) {
      throw new BookingError(dikenal.pesan, dikenal.status)
    }

    console.error('create_booking: errcode tidak dikenal', error.code, error.message)
    throw new BookingError('Gagal membuat booking, coba lagi', 500)
  }

  return data as Booking
}
