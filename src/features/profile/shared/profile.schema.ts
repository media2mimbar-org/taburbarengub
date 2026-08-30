import { z } from 'zod'

const optionalTrimmedText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') return ''
    return value.trim()
  })

export const completeProfileSchema = z.object({
  nama: z.string().trim().min(1, { message: 'Nama lengkap wajib diisi' }),
  nama_panggilan: optionalTrimmedText,
  no_hp: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{8,12}$/, {
      message: 'Format nomor WhatsApp tidak valid (contoh: 08123456789)',
    }),
  jenis_kelamin: z.enum(['ikhwan', 'akhwat']).optional(),
  tanggal_lahir: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Format tanggal lahir tidak valid (YYYY-MM-DD)',
    })
    .optional(),
  profesi: z.string().trim().min(1, { message: 'Profesi wajib diisi' }),
  domisili: z.string().trim().min(1, { message: 'Domisili wajib diisi' }),
})

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>

export const updateProfileSchema = z.object({
  nama: z.string().trim().min(1).optional(),
  nama_panggilan: z.string().trim().optional(),
  no_hp: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{8,12}$/, {
      message: 'Format nomor WhatsApp tidak valid (contoh: 08123456789)',
    })
    .optional(),
  jenis_kelamin: z.enum(['ikhwan', 'akhwat']).optional(),
  tanggal_lahir: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Format tanggal lahir tidak valid (YYYY-MM-DD)',
    })
    .optional(),
  profesi: z.string().trim().min(1).optional(),
  domisili: z.string().trim().min(1).optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
