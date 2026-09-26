import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/types/database.types'
import type {
  GradePayload,
  GradeSubmissionResult,
  SubmissionStatus,
  SubmitWritingResult,
  WritingSubmissionDTO,
} from '@/features/submission/shared/submission.types'
import {
  gradeSubmissionSchema,
  submitWritingSchema,
  type GradeSubmissionInput,
  type SubmitWritingInput,
} from '@/features/submission/shared/submission.schema'
export type WritingSubmissionRow =
  Database['public']['Tables']['writing_submissions']['Row']

/**
 * Melakukan penyetoran karya tulisan peserta melalui RPC setor_karya.
 * Memvalidasi format URL dan ekstensi file (.docx/.pdf) serta memetakan
 * error Postgres ke format diskriminasi kode error yang mudah ditangani.
 */
export async function submitWriting(
  supabase: SupabaseClient<Database>,
  input: SubmitWritingInput
): Promise<SubmitWritingResult> {
  try {
    const validation = submitWritingSchema.safeParse(input)
    if (!validation.success) {
      const errorMessage =
        validation.error.issues?.[0]?.message ?? 'Format submission karya tidak valid'
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        error: errorMessage,
      }
    }

    const { data, error } = await supabase.rpc('setor_karya', {
      p_file_url: validation.data.file_url,
    })

    if (error) {
      // Cocokkan hint (penanda stabil dari setor_karya). Jangan pernah pada teks pesan.
      const hint = typeof error.hint === 'string' ? error.hint : ''

      if (hint === 'BELUM_MASUK') {
        return {
          ok: false,
          code: 'UNAUTHORIZED',
          error: 'Silakan masuk terlebih dahulu',
        }
      }

      if (hint === 'FORMAT_FILE_TIDAK_VALID') {
        return { ok: false, code: 'VALIDATION_ERROR', error: error.message }
      }

      if (hint === 'BERKAS_BUKAN_MILIK') {
        return { ok: false, code: 'FILE_NOT_OWNED', error: 'Berkas harus diunggah ke folder milikmu sendiri' }
      }

      if (hint === 'JENDELA_SETOR_TERTUTUP') {
        return {
          ok: false,
          code: 'WINDOW_CLOSED',
          error: 'Jendela setor karya sedang ditutup',
        }
      }
      if (hint === 'BUKAN_SEASON_MILIK') {
        return {
          ok: false,
          code: 'NOT_OWNED',
          error: 'Anda belum terdaftar pada season yang sedang berjalan',
        }
      }

      return {
        ok: false,
        code: 'DB_ERROR',
        error: error.message || 'Gagal menyetor karya',
      }
    }

    if (!data) {
      return {
        ok: false,
        code: 'DB_ERROR',
        error: 'Tidak ada data karya yang dikembalikan dari database',
      }
    }

    const row = data as unknown as WritingSubmissionRow

    const submission: WritingSubmissionDTO = {
      id: row.id,
      user_id: row.user_id,
      kloter_id: row.kloter_id,
      versi: row.versi,
      file_url: row.file_url,
      status: row.status as SubmissionStatus,
      created_at: row.created_at,
    }

    return {
      ok: true,
      submission,
    }
  } catch (err) {
    return {
      ok: false,
      code: 'DB_ERROR',
      error:
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan sistem saat menyetor karya',
    }
  }
}

/**
 * Mengambil seluruh riwayat pengumpulan karya tulisan user untuk kloter tertentu,
 * diurutkan berdasarkan nomor versi menurun (versi terbaru di awal).
 */
export async function getUserSubmissions(
  supabase: SupabaseClient<Database>,
  userId: string,
  kloterId: string
): Promise<WritingSubmissionDTO[]> {
  try {
    const { data, error } = await supabase
      .from('writing_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('kloter_id', kloterId)
      .order('versi', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      kloter_id: item.kloter_id,
      versi: item.versi,
      file_url: item.file_url,
      status: item.status as SubmissionStatus,
      created_at: item.created_at,
    }))
  } catch {
    return []
  }
}

/**
 * Menyimpan penilaian naskah karya peserta oleh mentor/admin.
 * Memanggil RPC nilai_karya: gerbang penilai, naskah mengikat, dan b5 dijaga DB;
 * penilai dan waktunya dicatat DB di penilaian_naskah.
 */
export async function gradeSubmission(
  supabase: SupabaseClient<Database>,
  input: GradeSubmissionInput
): Promise<GradeSubmissionResult> {
  try {
    const validation = gradeSubmissionSchema.safeParse(input)
    if (!validation.success) {
      const errorMessage =
        validation.error.issues?.[0]?.message ?? 'Format penilaian naskah tidak valid'
      return { ok: false, error: errorMessage }
    }

    const { submission_id, rubrik, feedback } = validation.data

    const gradePayload: GradePayload = {
      rubrik,
      ...(feedback ? { feedback } : {}),
    }

    const { data, error } = await supabase.rpc('nilai_karya', {
      p_submission_id: submission_id,
      p_nilai: gradePayload as unknown as Json,
    })

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? 'Gagal menyimpan penilaian naskah',
      }
    }

    const row = data as unknown as WritingSubmissionRow

    const submission: WritingSubmissionDTO = {
      id: row.id,
      user_id: row.user_id,
      kloter_id: row.kloter_id,
      versi: row.versi,
      file_url: row.file_url,
      status: row.status as SubmissionStatus,
      created_at: row.created_at,
    }

    return { ok: true, submission }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan sistem saat menilai naskah',
    }
  }
}
