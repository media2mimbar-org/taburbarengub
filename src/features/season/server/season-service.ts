import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import type {
  KloterAktif,
  Season,
  SeasonOverview,
  UserSeasonOwnership,
  PublicSeasonCalendar,
} from '@/features/season/shared/season.types'

/**
 * Mengambil kloter yang saat ini sedang aktif secara global melalui view kloter_aktif.
 * Menerapkan fail-closed: jika view kosong atau terjadi kesalahan, kembalikan null.
 */
export async function getActiveKloter(
  supabase: SupabaseClient<Database>
): Promise<KloterAktif | null> {
  try {
    const { data, error } = await supabase
      .from('kloter_aktif')
      .select('*')
      .maybeSingle()

    if (error || !data || !data.id) {
      return null
    }

    return data
  } catch {
    return null
  }
}

/**
 * Mengambil informasi ringkasan/detail season beserta daftar kelas dan kloter (+ fasenya).
 * Menyortir kelas dan kloter secara ascending berdasarkan nomor urut.
 */
export async function getSeasonOverview(
  supabase: SupabaseClient<Database>,
  seasonId: string
): Promise<SeasonOverview | null> {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*, kloters(*, kloter_phases(*)), kelas(*)')
      .eq('id', seasonId)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    const rawData = data as unknown as {
      kelas?: Array<Database['public']['Tables']['kelas']['Row']>
      kloters?: Array<
        Database['public']['Tables']['kloters']['Row'] & {
          kloter_phases?: Array<Database['public']['Tables']['kloter_phases']['Row']>
        }
      >
    } & Season

    const kelas = Array.isArray(rawData.kelas)
      ? [...rawData.kelas].sort((a, b) => a.nomor - b.nomor)
      : []

    const kloters = Array.isArray(rawData.kloters)
      ? [...rawData.kloters].sort((a, b) => a.nomor - b.nomor)
      : []

    return {
      ...rawData,
      kelas,
      kloters,
    } as SeasonOverview
  } catch {
    return null
  }
}

/**
 * Alias untuk getSeasonOverview demi kompatibilitas antarmuka.
 */
export const getSeasonDetails = getSeasonOverview

/**
 * Memeriksa kepemilikan season oleh user dan mengambil jadwal dibukanya fase menyimak
 * untuk kloter tempat user mendaftar.
 */
export async function getUserSeasonOwnership(
  supabase: SupabaseClient<Database>,
  userId: string,
  seasonId: string
): Promise<UserSeasonOwnership | null> {
  try {
    const { data: userSeason, error: userSeasonError } = await supabase
      .from('user_seasons')
      .select('id, user_id, season_id, kloter_daftar_id, tanggal_diperoleh, sumber')
      .eq('user_id', userId)
      .eq('season_id', seasonId)
      .maybeSingle()

    if (userSeasonError || !userSeason) {
      return null
    }

    const { data: phaseRow } = await supabase
      .from('kloter_phases')
      .select('opens_at')
      .eq('kloter_id', userSeason.kloter_daftar_id)
      .eq('phase', 'menyimak')
      .maybeSingle()

    return {
      owned: true,
      ownsSeason: true,
      userSeasonId: userSeason.id,
      seasonId: userSeason.season_id,
      kloterDaftarId: userSeason.kloter_daftar_id,
      tanggalDiperoleh: userSeason.tanggal_diperoleh,
      sumber: userSeason.sumber,
      menyimakOpensAt: phaseRow?.opens_at ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Mengambil data kalender publik berupa kloter aktif saat ini dan season terkait.
 */
export async function getPublicSeasonCalendar(
  supabase: SupabaseClient<Database>
): Promise<PublicSeasonCalendar> {
  const activeKloter = await getActiveKloter(supabase)
  let currentSeason: Season | null = null

  if (activeKloter?.season_id) {
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', activeKloter.season_id)
      .maybeSingle()

    currentSeason = seasonData ?? null
  }

  if (!currentSeason) {
    const { data: fallbackSeason } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'berjalan')
      .maybeSingle()

    currentSeason = fallbackSeason ?? null
  }

  return {
    activeKloter,
    currentSeason,
  }
}

/**
 * Alias untuk getPublicSeasonCalendar demi kompatibilitas antarmuka.
 */
export const getPublicCalendar = getPublicSeasonCalendar
