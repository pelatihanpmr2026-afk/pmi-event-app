import { z } from 'zod'

const ratingSchema = z.coerce.number().int().min(1, 'Beri penilaian 1-5 bintang').max(5, 'Maksimal 5 bintang')

export const kritikSaranSchema = z.object({
  nama: z
    .string()
    .trim()
    .max(100, 'Nama maksimal 100 karakter')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  pesan: z
    .string()
    .trim()
    .min(10, 'Kritik & saran minimal 10 karakter')
    .max(1000, 'Kritik & saran maksimal 1000 karakter'),
  ratingPendaftaran: ratingSchema,
  ratingPerkemahan: ratingSchema,
  ratingAcara: ratingSchema,
})

export type KritikSaranValues = z.infer<typeof kritikSaranSchema>
