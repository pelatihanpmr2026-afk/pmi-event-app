import { z } from 'zod'

const nominalSchema = z
  .string()
  .min(1, 'Nominal wajib diisi')
  .regex(/^\d+$/, 'Nominal harus berupa angka')
  .refine((v) => Number(v) > 0, 'Nominal harus lebih dari 0')

export const transaksiKeuanganSchema = z
  .object({
    tanggal: z.string().min(1, 'Tanggal wajib diisi'),
    keterangan: z.string().min(3, 'Keterangan minimal 3 karakter').max(500),
    jenis: z.enum(['PEMASUKAN', 'PENGELUARAN', 'UTANG'], {
      error: (issue) => (issue.input === undefined ? 'Pilih jenis transaksi' : 'Jenis tidak valid'),
    }),
    kategoriPemasukan: z
      .enum(['PENDAFTARAN', 'SEWA_TENDA', 'SPONSOR', 'PERSENTASE_TENDA'])
      .optional(),
    kategoriPengeluaran: z
      .enum(['SETOR_TENDA', 'OPERASIONAL_DIVISI', 'BEBAN_PENGELUARAN'])
      .optional(),
    nominal: nominalSchema,
    divisi: z.string().min(1, 'Pilih divisi'),
    pic: z.string().trim().min(2, 'Pilih atau isi nama PIC'),
  })
  .superRefine((data, ctx) => {
    if (data.jenis === 'PEMASUKAN' && !data.kategoriPemasukan) {
      ctx.addIssue({ code: 'custom', path: ['kategoriPemasukan'], message: 'Pilih kategori pemasukan' })
    }
    if (data.jenis === 'PENGELUARAN' && !data.kategoriPengeluaran) {
      ctx.addIssue({
        code: 'custom',
        path: ['kategoriPengeluaran'],
        message: 'Pilih kategori pengeluaran',
      })
    }
  })

export type TransaksiKeuanganFormValues = z.infer<typeof transaksiKeuanganSchema>
