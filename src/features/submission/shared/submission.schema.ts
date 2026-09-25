import { z } from 'zod'

export const submitWritingSchema = z.object({
  // Path objek di bucket karya-tulis: {user_id}/.../{nama}.pdf. DB menolak folder milik orang lain.
  file_url: z
    .string()
    .trim()
    .min(1, 'Path file tidak boleh kosong')
    .regex(/^[\w\-/.]+\.(docx|doc|pdf)$/i, 'File karya harus berformat Word (.docx, .doc) atau PDF (.pdf)'),
})
export type SubmitWritingInput = z.infer<typeof submitWritingSchema>

export const gradeSubmissionSchema = z.object({
  submission_id: z.string().uuid('ID naskah tidak valid'),
  rubrik: z.object({
    konten: z.enum(['A', 'B', 'C']),
    bahasa: z.enum(['A', 'B', 'C']),
  }),
  feedback: z.string().trim().max(2000).optional(),
})
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>
