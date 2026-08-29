import type { PhaseType } from './season.types'

export interface CanAccessVideoParams {
  ownsSeason: boolean
  menyimakOpensAt: string | Date | null | undefined
  now?: string | Date | null
}

export const PHASE_LABELS: Record<PhaseType, string> = {
  offline: 'Kajian Offline',
  pendaftaran: 'Pendaftaran',
  orientasi: 'Orientasi',
  menyimak: 'Menyimak Materi',
  menulis_setor: 'Menulis & Setor',
  wrapped: 'Selesai & Sertifikat',
  antara_kloter: 'Antara Kloter',
}

/**
 * Memeriksa apakah user berhak mengakses video materi kelas season.
 *
 * Syarat:
 * 1. User memiliki season (`ownsSeason === true`).
 * 2. Fase menyimak sudah dibuka (`menyimakOpensAt <= now`).
 * 3. Untuk season lampau/arsip yang sudah lewat, akses tetap terbuka seumur hidup
 *    karena opens_at berada di masa lampau (opens_at <= now tetap true).
 */
export function canAccessVideo({ ownsSeason, menyimakOpensAt, now }: CanAccessVideoParams): boolean {
  if (!ownsSeason || !menyimakOpensAt) {
    return false
  }

  const opensAtTime = new Date(menyimakOpensAt).getTime()
  if (Number.isNaN(opensAtTime)) {
    return false
  }

  const nowTime = now ? new Date(now).getTime() : Date.now()
  if (Number.isNaN(nowTime)) {
    return false
  }

  return opensAtTime <= nowTime
}

/**
 * Memeriksa apakah jendela setor karya tulis sedang aktif/terbuka.
 * Hanya bernilai true saat fase aktif adalah 'menulis_setor'.
 */
export function isSubmissionWindowOpen(activePhase: PhaseType | null | undefined): boolean {
  return activePhase === 'menulis_setor'
}

/**
 * Mendapatkan label tampilan bahasa Indonesia untuk fase kloter.
 */
export function getPhaseLabel(phase: PhaseType): string {
  return PHASE_LABELS[phase] ?? phase
}
