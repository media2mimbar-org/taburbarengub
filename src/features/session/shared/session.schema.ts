import { z } from 'zod'
import { nullableTrimmedText } from '@/lib/zod-helpers'
import type { Database } from '@/lib/types/database.types'

/** Kolom sesi yang boleh dibaca klien. `rekaman_url` rahasia (§3.10), jadi `select('*')` ditolak DB. */
export const SESSION_COLUMNS =
  'id, nama_sesi, tanggal_waktu, lokasi_atau_link, deskripsi, kapasitas, kuota_terisi, kapasitas_kids, kuota_kids_terisi, status, kloter_id, created_at' as const

export type EventSession = Omit<Database['public']['Tables']['event_sessions']['Row'], 'rekaman_url'>

export const sessionPayloadSchema = z.object({
  nama_sesi: z.string().trim().min(1, { message: 'Nama sesi wajib diisi' }),
  tanggal_waktu: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: 'Tanggal dan waktu tidak valid',
    }),
  lokasi_atau_link: nullableTrimmedText,
  deskripsi: nullableTrimmedText,
  kapasitas: z
    .number({ message: 'Kapasitas harus berupa angka' })
    .int({ message: 'Kapasitas harus berupa angka bulat' })
    .positive({ message: 'Kapasitas harus lebih dari 0' }),
  kapasitas_kids: z
    .number({ message: 'Kapasitas Kids Corner harus berupa angka' })
    .int({ message: 'Kapasitas Kids Corner harus berupa angka bulat' })
    .min(0, { message: 'Kapasitas Kids Corner minimal 0' })
    .default(0),
  status: z.enum(['draft', 'published', 'cancelled'], { message: 'Status sesi tidak valid' }),
  kloter_id: z.string().uuid({ message: 'ID kloter tidak valid' }).nullable().optional(),
})

export type SessionPayload = z.infer<typeof sessionPayloadSchema>
