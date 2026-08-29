import { z } from 'zod'

// Validasi input SEBELUM masuk ke business logic.
export const createBookingSchema = z.object({
  session_id: z.string().uuid({ message: 'session_id tidak valid' }),
  jumlah_anak: z.number().int().min(0).max(5).default(0),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
