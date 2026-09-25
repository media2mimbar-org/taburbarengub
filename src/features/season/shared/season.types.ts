import type { Database } from '@/lib/types/database.types'

type Tables = Database['public']['Tables']

/** Empat fase berjadwal (§3.3). Bukan enum DB; diturunkan dari tanggal b1–b5. */
export type FaseKloter = 'pendaftaran' | 'orientasi' | 'menyimak' | 'menulis_setor'

/** Status siklus season, diturunkan oleh computed field `status_siklus` (§3.2). */
export type StatusSiklusSeason = 'draft' | 'akan_datang' | 'berjalan' | 'selesai'

export type KloterStatus = 'draft' | 'berjalan' | 'wrapped'

export type Season = Tables['seasons']['Row']
export type SeasonInsert = Tables['seasons']['Insert']
export type SeasonUpdate = Tables['seasons']['Update']

/** Kolom kloter yang boleh dibaca publik; `livestream_url` rahasia (§3.10). */
export const KLOTER_PUBLIC_COLUMNS =
  'id, season_id, nomor, kapasitas, status, tanggal_mulai, tgl_mulai_orientasi, tgl_mulai_menyimak, tgl_mulai_setor, tgl_tenggat_setor, tanggal_selesai, target_penilaian, ambang_pengingat, livestream_at' as const

export type Kloter = Omit<Tables['kloters']['Row'], 'livestream_url'>
export type KloterInsert = Tables['kloters']['Insert']
export type KloterUpdate = Tables['kloters']['Update']

/** Kolom kelas yang boleh dibaca publik; `video_url` rahasia (§3.10). */
export const KELAS_PUBLIC_COLUMNS = 'id, season_id, nomor, judul, jumlah_soal_tampil' as const

export type Kelas = Omit<Tables['kelas']['Row'], 'video_url'>

export type UserSeason = Tables['user_seasons']['Row']
export type SeasonSource = UserSeason['sumber']

export type KloterDalamFase = Database['public']['Views']['kloter_dalam_fase']['Row']

export interface SeasonOverview extends Season {
  status_siklus: StatusSiklusSeason
  kloters: Kloter[]
  kelas: Kelas[]
}

export interface PublicSeasonCalendar {
  kloterDalamFase: KloterDalamFase | null
  currentSeason: (Season & { status_siklus: StatusSiklusSeason }) | null
}
