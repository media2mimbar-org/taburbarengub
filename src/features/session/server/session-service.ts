import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import type { SessionPayload } from '@/features/session/shared/session.schema'

type EventSession = Database['public']['Tables']['event_sessions']['Row']

export class SessionError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
  }
}

function mapSessionSaveError(error: { code?: string; message: string }): SessionError {
  if (error.code === 'TB104' || error.code === 'TB301') {
    return new SessionError('Sesi bertanggal lampau tidak bisa dipublikasikan', 409)
  }
  if (error.code === '23514') {
    return new SessionError('Data sesi melanggar aturan database', 400)
  }

  console.error('event_sessions save error', error.code, error.message)
  return new SessionError('Gagal menyimpan sesi, coba lagi', 500)
}

export async function createEventSession(
  supabase: SupabaseClient<Database>,
  payload: SessionPayload
): Promise<EventSession> {
  const { data, error } = await supabase
    .from('event_sessions')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw mapSessionSaveError(error)
  }

  return data
}

export async function updateEventSession(
  supabase: SupabaseClient<Database>,
  id: string,
  payload: SessionPayload
): Promise<EventSession> {
  const { data: existing, error: existingError } = await supabase
    .from('event_sessions')
    .select('kuota_terisi')
    .eq('id', id)
    .maybeSingle()

  if (existingError) {
    console.error('event_sessions lookup error', existingError.code, existingError.message)
    throw new SessionError('Gagal memuat sesi, coba lagi', 500)
  }

  if (!existing) {
    throw new SessionError('Sesi tidak ditemukan', 404)
  }

  if (payload.kapasitas < existing.kuota_terisi) {
    throw new SessionError(
      `Kapasitas tidak boleh lebih kecil dari kuota terisi saat ini (${existing.kuota_terisi})`,
      400
    )
  }

  const { data, error } = await supabase
    .from('event_sessions')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw mapSessionSaveError(error)
  }

  return data
}
