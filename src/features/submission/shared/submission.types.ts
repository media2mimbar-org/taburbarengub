export type SubmissionStatus = 'menunggu' | 'sedang_dibaca' | 'dinilai'

export interface GradeRubric {
  konten: 'A' | 'B' | 'C'
  bahasa: 'A' | 'B' | 'C'
}

export interface GradePayload {
  graded_by: string
  graded_at: string
  rubrik: GradeRubric
  feedback?: string
  rekomendasi: 'lulus' | 'revisi' | 'ikut_serta'
}

export interface WritingSubmissionDTO {
  id: string
  user_id: string
  kloter_id: string
  versi: number
  file_url: string
  status: SubmissionStatus
  nilai: GradePayload | null
  created_at: string
}

export type SubmitWritingErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NO_ACTIVE_KLOTER'
  | 'WINDOW_CLOSED'
  | 'NOT_OWNED'
  | 'DB_ERROR'

export type SubmitWritingResult =
  | { ok: true; submission: WritingSubmissionDTO }
  | { ok: false; code: SubmitWritingErrorCode; error: string }

export type GradeSubmissionResult =
  | { ok: true; submission: WritingSubmissionDTO }
  | { ok: false; error: string }
