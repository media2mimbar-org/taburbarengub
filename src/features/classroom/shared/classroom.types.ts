import type { Database } from '@/lib/types/database.types'

type Functions = Database['public']['Functions']

/** Status kuis satu kelas, dihitung DB lewat get_status_kuis. */
export type StatusKuis =
  | 'belum_buka'
  | 'terbuka'
  | 'tutup'
  | 'sudah_dijawab'
  | 'belum_tersedia'

export type SoalKuis = Functions['get_soal_kelas']['Returns'][number]

export interface ClassWithProgress {
  id: string
  season_id: string
  nomor: number
  judul: string
  /** null = terkunci; gerbangnya get_video_url. */
  video_url: string | null
  /** null = bukan peserta bimbingan (arsip, admin, atau bukan pemilik). */
  kuis: StatusKuis | null
}

export type KuisResult<T> =
  | ({ ok: true } & T)
  | { ok: false; code: string; error: string }
