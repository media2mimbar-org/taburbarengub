import { z } from 'zod'

/** Kontrak jawab_kuis: { "<id soal>": <indeks pilihan> }. Skor dihitung DB. */
export const jawabKuisSchema = z.object({
  kelas_id: z.uuid(),
  jawaban: z
    .record(z.uuid(), z.number().int().min(0))
    .refine((j) => Object.keys(j).length > 0, { message: 'Jawaban tidak boleh kosong' }),
})

export type JawabKuisInput = z.infer<typeof jawabKuisSchema>
