import { z } from 'zod'

export const konfirmasiPembayaranSchema = z
  .object({
    aksi: z.enum(['LUNAS', 'DITOLAK']),
    catatanAdmin: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.aksi === 'DITOLAK' && (!data.catatanAdmin || data.catatanAdmin.trim().length < 5)) {
      ctx.addIssue({
        code: 'custom',
        path: ['catatanAdmin'],
        message: 'Alasan penolakan wajib diisi (minimal 5 karakter)',
      })
    }
  })

export type KonfirmasiPembayaranValues = z.infer<typeof konfirmasiPembayaranSchema>