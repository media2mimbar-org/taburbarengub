import { z } from 'zod'

export const submitWritingSchema = z.object({
  file_url: z
    .string()
    .url('URL file tidak valid')
    .refine(
      (url) => {
        const cleanUrl = url.split('?')[0]
        return /\.(docx|pdf)$/i.test(cleanUrl)
      },
      { message: 'File karya harus berformat Word (.docx) atau PDF (.pdf)' }
    ),
})
export type SubmitWritingInput = z.infer<typeof submitWritingSchema>

export const gradeSubmissionSchema = z.object({
  submission_id: z.string().uuid('ID naskah tidak valid'),
  rubrik: z.object({
    konten: z.enum(['A', 'B', 'C']),
    bahasa: z.enum(['A', 'B', 'C']),
  }),
  feedback: z.string().trim().max(2000).optional(),
  rekomendasi: z.enum(['lulus', 'revisi', 'ikut_serta']),
})
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>
