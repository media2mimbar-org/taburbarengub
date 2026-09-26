export type SubmissionStatus = 'menunggu' | 'dinilai'

export interface GradeRubric {
  konten: 'A' | 'B' | 'C'
  bahasa: 'A' | 'B' | 'C'
}

/** Isi `penilaian_naskah.nilai`. Penilai dan waktunya dicatat DB dari sesi login. */
export interface GradePayload {
  rubrik: GradeRubric
  feedback?: string
}

export interface WritingSubmissionDTO {
  id: string
  user_id: string
  kloter_id: string
  versi: number
  file_url: string
  status: SubmissionStatus
  created_at: string
}

export type SubmitWritingErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FILE_NOT_OWNED'
  | 'WINDOW_CLOSED'
  | 'NOT_OWNED'
  | 'DB_ERROR'

export type SubmitWritingResult =
  | { ok: true; submission: WritingSubmissionDTO }
  | { ok: false; code: SubmitWritingErrorCode; error: string }

export type GradeSubmissionResult =
  | { ok: true; submission: WritingSubmissionDTO }
  | { ok: false; error: string }
