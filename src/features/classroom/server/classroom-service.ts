import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/types/database.types'
import { getUserSeasonOwnership } from '@/features/season/server/season-service'
import { canAccessVideo } from '@/features/season/shared/season-rules'
import type {
  ClassWithProgress,
  QuizAnswerItem,
  QuizSubmissionPayload,
} from '@/features/classroom/shared/classroom.types'
import {
  submitQuizSchema,
  type SubmitQuizInput,
} from '@/features/classroom/shared/classroom.schema'
export type VideoProgressRow = Database['public']['Tables']['video_progress']['Row']

export type SubmitQuizResult =
  | { ok: true; progress: VideoProgressRow }
  | { ok: false; error: string }

/**
 * Mengambil daftar kelas dalam suatu season beserta status progres video user.
 * Video URL hanya terbuka jika user memiliki season dan fase menyimak sudah aktif.
 */
export async function getClassListWithProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
  seasonId: string,
  now?: Date
): Promise<ClassWithProgress[]> {
  try {
    const ownership = await getUserSeasonOwnership(supabase, userId, seasonId)
    const canAccess = canAccessVideo({
      ownsSeason: Boolean(ownership?.ownsSeason ?? ownership?.owned),
      menyimakOpensAt: ownership?.menyimakOpensAt,
      now,
    })

    const { data: kelasList, error: kelasError } = await supabase
      .from('kelas')
      .select('id, season_id, nomor, judul')
      .eq('season_id', seasonId)
      .order('nomor', { ascending: true })

    if (kelasError || !kelasList || kelasList.length === 0) {
      return []
    }

    const kelasIds = kelasList.map((k) => k.id)
    const { data: progressList } = await supabase
      .from('video_progress')
      .select('id, user_id, kelas_id, ditonton, skor, jawaban_soal')
      .eq('user_id', userId)
      .in('kelas_id', kelasIds)

    const progressLookup: Record<string, VideoProgressRow> = {}
    if (progressList) {
      for (const p of progressList) {
        progressLookup[p.kelas_id] = p
      }
    }

    const videoUrlResults = canAccess
      ? await Promise.all(
          kelasList.map((k) =>
            supabase.rpc('get_video_url', { p_kelas_id: k.id }).then((r) => ({
              id: k.id,
              url: r.data as string | null,
            }))
          )
        )
      : []

    const videoUrlLookup: Record<string, string | null> = {}
    for (const v of videoUrlResults) {
      videoUrlLookup[v.id] = v.url
    }

    return kelasList.map((kelas) => {
      const progress = progressLookup[kelas.id]
      return {
        id: kelas.id,
        season_id: kelas.season_id,
        nomor: kelas.nomor,
        judul: kelas.judul,
        video_url: canAccess ? (videoUrlLookup[kelas.id] ?? null) : null,
        ditonton: progress?.ditonton ?? false,
        skor: progress?.skor ?? null,
        is_locked: !canAccess,
      }
    })
  } catch {
    return []
  }
}

/**
 * Menyimpan progres kuis video kelas dan menghitung skor jawaban.
 * Jika answerKey disediakan, jawaban dicocokkan dengan kunci jawaban.
 * Jika answerKey tidak disediakan, submission dianggap lengkap dengan skor 100.
 */
export async function submitQuizProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: SubmitQuizInput,
  answerKey?: Record<number, string>
): Promise<SubmitQuizResult> {
  try {
    const validation = submitQuizSchema.safeParse(input)
    if (!validation.success) {
      const errorMessage =
        validation.error.issues?.[0]?.message ?? 'Format submission kuis tidak valid'
      return { ok: false, error: errorMessage }
    }

    const validData = validation.data
    const totalSoal = validData.answers.length

    let benar = 0
    let skor = 0
    let jawaban: QuizAnswerItem[] = []

    if (answerKey !== undefined) {
      jawaban = validData.answers.map((ans) => {
        const kunci = answerKey[ans.soal_id]
        const is_correct =
          kunci !== undefined
            ? ans.pilihan.trim().toLowerCase() === kunci.trim().toLowerCase()
            : false

        if (is_correct) {
          benar += 1
        }

        return {
          soal_id: ans.soal_id,
          pilihan: ans.pilihan,
          is_correct,
          ...(kunci !== undefined ? { kunci } : {}),
        }
      })

      skor = totalSoal > 0 ? Math.round((benar / totalSoal) * 100) : 0
    } else {
      benar = totalSoal
      skor = 100
      jawaban = validData.answers.map((ans) => ({
        soal_id: ans.soal_id,
        pilihan: ans.pilihan,
      }))
    }

    const payload: QuizSubmissionPayload = {
      submitted_at: new Date().toISOString(),
      total_soal: totalSoal,
      benar,
      jawaban,
    }

    const { data, error } = await supabase
      .rpc('submit_classroom_progress', {
        p_kelas_id: validData.kelas_id,
        p_watched_seconds: 60,
        p_quiz_answers: payload as unknown as Json,
        p_quiz_score: skor,
      })
      .single()

    if (error || !data) {
      const errHint = error && typeof error === 'object' && 'hint' in error ? error.hint : undefined
      if (errHint === 'BUKAN_SEASON_MILIK') {
        return { ok: false, error: 'Kamu belum terdaftar di season ini' }
      }
      if (errHint === 'FASE_BELUM_DIBUKA') {
        return { ok: false, error: 'Akses materi kelas belum dibuka untuk kloter ini' }
      }
      if (errHint === 'KELAS_TIDAK_DITEMUKAN') {
        return { ok: false, error: 'Kelas tidak ditemukan' }
      }
      return {
        ok: false,
        error: error?.message ?? 'Gagal menyimpan progres kuis',
      }
    }

    return {
      ok: true,
      progress: data,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan sistem',
    }
  }
}
