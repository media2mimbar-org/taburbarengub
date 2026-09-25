import type { FaseKloter } from './season.types'

// Label tampilan saja. Gerbang (boleh nonton/setor/kuis) diputuskan DB, bukan di sini (§2.4).
export const PHASE_LABELS: Record<FaseKloter, string> = {
  pendaftaran: 'Pendaftaran',
  orientasi: 'Orientasi',
  menyimak: 'Menyimak Materi',
  menulis_setor: 'Menulis & Setor',
}
