import { z } from 'zod'

export const dataSekolahSchema = z.object({
  jenjang: z.enum(['SMP', 'MTS', 'SMA', 'SMK', 'MA'], {
    error: (issue) => (issue.input === undefined ? 'Pilih jenjang sekolah' : 'Jenjang tidak valid'),
  }),
  statusSekolah: z.enum(['NEGERI', 'SWASTA'], {
    error: (issue) => (issue.input === undefined ? 'Pilih status sekolah' : 'Status tidak valid'),
  }),
  namaInput: z
    .string()
    .min(2, 'Nama sekolah minimal 2 karakter')
    .max(150, 'Nama sekolah maksimal 150 karakter'),
  namaPembina: z
    .string()
    .min(3, 'Nama pembina minimal 3 karakter')
    .max(100, 'Nama pembina maksimal 100 karakter'),
  noWhatsappPembina: z
    .string()
    .min(9, 'Nomor WhatsApp tidak valid')
    .max(15, 'Nomor WhatsApp tidak valid')
    .regex(/^(08|628)[0-9]+$/, 'Format nomor harus diawali 08 atau 628'),
})

export type DataSekolahValues = z.infer<typeof dataSekolahSchema>

export const dataSekolahMiniSchema = dataSekolahSchema.extend({
  estimasiPesertaPendamping: z
    .string()
    .min(1, 'Estimasi jumlah wajib diisi')
    .regex(/^\d+$/, 'Harus berupa angka')
    .refine((val) => Number(val) >= 1, 'Estimasi minimal 1 orang'),
})

export type DataSekolahMiniValues = z.infer<typeof dataSekolahMiniSchema>