import { z } from 'zod'

const numericStringSchema = (label: string, min = 0) =>
  z
    .string()
    .min(1, `${label} wajib diisi`)
    .regex(/^\d+$/, `${label} harus berupa angka`)
    .refine((val) => Number(val) >= min, `${label} minimal ${min}`)

export const tendaJenisSchema = z
  .object({
    nama: z.string().min(3, 'Nama minimal 3 karakter').max(100),
    namaVendor: z.string().trim().min(2, 'Nama vendor wajib diisi').max(100),
    kapasitasMin: numericStringSchema('Kapasitas min', 1),
    kapasitasMax: numericStringSchema('Kapasitas maks', 1),
    harga: numericStringSchema('Harga', 0),
    hargaVendor: numericStringSchema('Harga vendor', 0),
    stokTotal: numericStringSchema('Stok', 0),
  })
  .refine((data) => Number(data.kapasitasMax) >= Number(data.kapasitasMin), {
    message: 'Kapasitas maksimal harus lebih besar atau sama dengan kapasitas minimal',
    path: ['kapasitasMax'],
  })

export type TendaJenisFormValues = z.infer<typeof tendaJenisSchema>

export const tendaJenisApiSchema = z
  .object({
    nama: z.string().min(3, 'Nama minimal 3 karakter').max(100),
    namaVendor: z.string().trim().min(2, 'Nama vendor wajib diisi').max(100),
    kapasitasMin: z.number().int().min(1, 'Kapasitas min minimal 1'),
    kapasitasMax: z.number().int().min(1, 'Kapasitas maks minimal 1'),
    harga: z.number().int().min(0, 'Harga tidak boleh negatif'),
    hargaVendor: z.number().int().min(0, 'Harga vendor tidak boleh negatif'),
    stokTotal: z.number().int().min(0, 'Stok tidak boleh negatif'),
  })
  .refine((data) => data.kapasitasMax >= data.kapasitasMin, {
    message: 'Kapasitas maksimal harus lebih besar atau sama dengan kapasitas minimal',
    path: ['kapasitasMax'],
  })