import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  KELAS_PUBLIC_COLUMNS,
  KLOTER_PUBLIC_COLUMNS,
  type KloterDalamFase,
  type PublicSeasonCalendar,
  type SeasonOverview,
} from '@/features/season/shared/season.types'

/**
 * Kloter yang sedang berada di salah satu dari empat fase berjadwal (view kloter_dalam_fase).
 * Unik berkat GiST; kosong di celah antar kloter. Fail-closed: error → null.
 */
export async function getKloterDalamFase(
  supabase: SupabaseClient<Database>
): Promise<KloterDalamFase | null> {
  const { data, error } = await supabase.from('kloter_dalam_fase').select('*').maybeSingle()
  if (error || !data?.id) return null
  return data
}

/** Season beserta status siklus, kloter, dan kelas, terurut berdasarkan nomor. */
export async function getSeasonOverview(
  supabase: SupabaseClient<Database>,
  seasonId: string
): Promise<SeasonOverview | null> {
  const { data, error } = await supabase
    .from('seasons')
    .select(`*, status_siklus, kloters(${KLOTER_PUBLIC_COLUMNS}), kelas(${KELAS_PUBLIC_COLUMNS})`)
    .eq('id', seasonId)
    .order('nomor', { referencedTable: 'kloters' })
    .order('nomor', { referencedTable: 'kelas' })
    .maybeSingle()

  if (error || !data) return null
  return data as unknown as SeasonOverview
}

/** Kloter dalam fase dan season-nya; kalau tidak ada, season yang sedang berjalan. */
export async function getPublicSeasonCalendar(
  supabase: SupabaseClient<Database>
): Promise<PublicSeasonCalendar> {
  const kloterDalamFase = await getKloterDalamFase(supabase)

  // postgrest-js belum mengetik computed field (status_siklus); bentuknya dijamin DB.
  const query = supabase.from('seasons').select('*, status_siklus')
  if (kloterDalamFase?.season_id) {
    const { data } = await query.eq('id', kloterDalamFase.season_id).maybeSingle()
    return { kloterDalamFase, currentSeason: (data as unknown as PublicSeasonCalendar['currentSeason']) ?? null }
  }

  // Season terbit cuma segelintir per tahun; saring status turunan di sini.
  const { data } = await query.eq('terbit', true)
  const seasons = (data ?? []) as unknown as NonNullable<PublicSeasonCalendar['currentSeason']>[]
  return {
    kloterDalamFase,
    currentSeason: seasons.find((s) => s.status_siklus === 'berjalan') ?? null,
  }
}
