export interface QuizAnswerItem {
  soal_id: number
  pilihan: string
  is_correct?: boolean
  kunci?: string
}

export interface QuizSubmissionPayload {
  submitted_at: string
  total_soal: number
  benar: number
  jawaban: QuizAnswerItem[]
}

export interface ClassWithProgress {
  id: string
  season_id: string
  nomor: number
  judul: string
  video_url: string | null
  ditonton: boolean
  skor: number | null
  is_locked: boolean
}
