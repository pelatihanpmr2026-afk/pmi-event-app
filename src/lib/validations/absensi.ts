import { z } from 'zod'

export const sesiSchema = z
  .object({
    nama: z.string().min(3, 'Nama sesi minimal 3 karakter').max(100),
    tanggal: z.string().min(1, 'Tanggal wajib diisi'),
    jamMulai: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam mulai tidak valid'),
    jamSelesai: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam selesai tidak valid'),
  })
  .refine((data) => data.jamMulai < data.jamSelesai, {
    message: 'Jam selesai harus setelah jam mulai',
    path: ['jamSelesai'],
  })

export type SesiFormValues = z.infer<typeof sesiSchema>