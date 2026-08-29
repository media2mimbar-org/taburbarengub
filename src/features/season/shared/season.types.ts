import type { Database } from '@/lib/types/database.types'

export type PhaseType = Database['public']['Enums']['phase_type']

export type SeasonStatus = Database['public']['Tables']['seasons']['Row']['status']

export type Season = Database['public']['Tables']['seasons']['Row']
export type SeasonInsert = Database['public']['Tables']['seasons']['Insert']
export type SeasonUpdate = Database['public']['Tables']['seasons']['Update']

export type Kloter = Database['public']['Tables']['kloters']['Row']
export type KloterInsert = Database['public']['Tables']['kloters']['Insert']
export type KloterUpdate = Database['public']['Tables']['kloters']['Update']

export type KloterPhase = Database['public']['Tables']['kloter_phases']['Row']
export type KloterPhaseInsert = Database['public']['Tables']['kloter_phases']['Insert']
export type KloterPhaseUpdate = Database['public']['Tables']['kloter_phases']['Update']

export type Kelas = Database['public']['Tables']['kelas']['Row']
export type KelasInsert = Database['public']['Tables']['kelas']['Insert']
export type KelasUpdate = Database['public']['Tables']['kelas']['Update']

export type UserSeason = Database['public']['Tables']['user_seasons']['Row']
export type UserSeasonInsert = Database['public']['Tables']['user_seasons']['Insert']
export type UserSeasonUpdate = Database['public']['Tables']['user_seasons']['Update']

export type VideoProgress = Database['public']['Tables']['video_progress']['Row']
export type VideoProgressInsert = Database['public']['Tables']['video_progress']['Insert']
export type VideoProgressUpdate = Database['public']['Tables']['video_progress']['Update']

export type WritingSubmission = Database['public']['Tables']['writing_submissions']['Row']
export type WritingSubmissionInsert = Database['public']['Tables']['writing_submissions']['Insert']
export type WritingSubmissionUpdate = Database['public']['Tables']['writing_submissions']['Update']

export type Certificate = Database['public']['Tables']['certificates']['Row']
export type CertificateInsert = Database['public']['Tables']['certificates']['Insert']
export type CertificateUpdate = Database['public']['Tables']['certificates']['Update']

export type KloterAktif = Database['public']['Views']['kloter_aktif']['Row']

export type SubmissionStatus = Database['public']['Tables']['writing_submissions']['Row']['status']
export type CertificateType = Database['public']['Tables']['certificates']['Row']['jenis']
export type SeasonSource = Database['public']['Tables']['user_seasons']['Row']['sumber']

export interface KloterWithPhases extends Kloter {
  phases?: KloterPhase[]
  kloter_phases?: KloterPhase[]
}

export interface SeasonWithPhases extends Season {
  kloters: KloterWithPhases[]
}

export interface SeasonOverview extends Season {
  kloters: (Kloter & { kloter_phases?: KloterPhase[] })[]
  kelas: Kelas[]
}

export interface UserSeasonOwnership {
  owned: boolean
  ownsSeason?: boolean
  userSeasonId: string
  seasonId: string
  kloterDaftarId: string
  tanggalDiperoleh: string
  sumber: SeasonSource
  menyimakOpensAt: string | null
}

export interface PublicSeasonCalendar {
  activeKloter: KloterAktif | null
  currentSeason: Season | null
}
