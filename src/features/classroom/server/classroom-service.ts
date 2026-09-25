import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { KELAS_PUBLIC_COLUMNS } from '@/features/season/shared/season.types'
import type {
  ClassWithProgress,
  KuisResult,
  SoalKuis,
  StatusKuis,
} from '@/features/classroom/shared/classroom.types'
import { jawabKuisSchema, type JawabKuisInput } from '@/features/classroom/shared/classroom.schema'

function gagal(error: PostgrestError | null, fallback: string) {
  return {
    ok: false as const,
    code: error?.hint || error?.code || 'DB_ERROR',
    error: error?.message || fallback,
  }
}

/**
 * Daftar kelas satu season. Semua gerbang dibaca dari DB (§2.4):
 * video lewat get_video_url, kuis lewat get_status_kuis.
 */
export async function getClassListWithProgress(
  supabase: SupabaseClient<Database>,
  seasonId: string
): Promise<ClassWithProgress[]> {
  const { data: kelasList, error } = await supabase
    .from('kelas')
    .select(KELAS_PUBLIC_COLUMNS)
    .eq('season_id', seasonId)
    .order('nomor')

  if (error || !kelasList?.length) return []

  const [urls, statusKuis] = await Promise.all([
    Promise.all(kelasList.map((k) => supabase.rpc('get_video_url', { p_kelas_id: k.id }))),
    // Ditolak untuk bukan peserta bimbingan → tidak ada kuis, bukan error.
    supabase.rpc('get_status_kuis', { p_season_id: seasonId }),
  ])

  const kuisByKelas = new Map(
    (statusKuis.data ?? []).map((s) => [s.kelas_id, s.status as StatusKuis])
  )

  return kelasList.map((kelas, i) => ({
    id: kelas.id,
    season_id: kelas.season_id,
    nomor: kelas.nomor,
    judul: kelas.judul,
    video_url: urls[i]?.data ?? null,
    kuis: kuisByKelas.get(kelas.id) ?? null,
  }))
}

/** Membuka kuis: menyajikan soal tanpa kunci; undian dikunci DB saat pertama dibuka. */
export async function getSoalKelas(
  supabase: SupabaseClient<Database>,
  kelasId: string
): Promise<KuisResult<{ soal: SoalKuis[] }>> {
  const { data, error } = await supabase.rpc('get_soal_kelas', { p_kelas_id: kelasId })
  if (error || !data) return gagal(error, 'Gagal membuka kuis')
  return { ok: true, soal: data }
}

/** Mengirim jawaban sekali. Skor dihitung DB dan sengaja tidak dikembalikan ke peserta (D3c). */
export async function jawabKuis(
  supabase: SupabaseClient<Database>,
  input: JawabKuisInput
): Promise<KuisResult<object>> {
  const parsed = jawabKuisSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      error: parsed.error.issues[0]?.message ?? 'Format jawaban tidak valid',
    }
  }

  const { error } = await supabase.rpc('jawab_kuis', {
    p_kelas_id: parsed.data.kelas_id,
    p_jawaban: parsed.data.jawaban,
  })
  if (error) return gagal(error, 'Gagal mengirim jawaban')
  return { ok: true }
}
