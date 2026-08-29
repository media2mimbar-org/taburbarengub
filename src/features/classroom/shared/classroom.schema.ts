import { z } from 'zod'

export const submitQuizSchema = z.object({
  kelas_id: z.string().uuid(),
  answers: z
    .array(
      z.object({
        soal_id: z.number().int().positive(),
        pilihan: z.string().trim().min(1),
      })
    )
    .min(1)
    .max(10),
})

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>
