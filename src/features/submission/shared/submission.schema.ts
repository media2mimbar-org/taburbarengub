import { z } from 'zod'

export const submitWritingSchema = z.object({
  file_url: z
    .string()
    .trim()
    .min(1, 'Path file tidak boleh kosong')
    .refine(
      (val) => {
        const clean = val.split('?')[0] ?? ''
        return /^[\w\-/.]+\.(docx|doc|pdf)$/i.test(clean) || /^https?:\/\/.+\.(docx|doc|pdf)$/i.test(clean)
      },
      { message: 'File karya harus berformat Word (.docx, .doc) atau PDF (.pdf)' }
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
