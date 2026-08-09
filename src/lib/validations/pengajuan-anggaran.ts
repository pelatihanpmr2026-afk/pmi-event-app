import { z } from 'zod'

export const dataPengajuSchema = z.object({
  namaKoordinator: z
    .string()
    .min(3, 'Nama koordinator minimal 3 karakter')
    .max(100, 'Nama koordinator maksimal 100 karakter'),
  divisi: z.enum(
    [
      'KOMANDAN', 'KETUA_PELAKSANA', 'WAKIL_KETUA', 'BENDAHARA',
      'WAKIL_BENDAHARA_1', 'WAKIL_BENDAHARA_2', 'SEKRETARIS', 'WAKIL_SEKRETARIS',
      'KESEKRETARIATAN', 'ACARA', 'HUMAS_DAN_DOKUMENTASI', 'GIAT',
      'KEAMANAN_DAN_EVAKUASI', 'SANITASI', 'TRANSPORTASI', 'PERKEMAHAN',
      'DAPUR_UMUM', 'PERALATAN', 'YANKES',
    ],
    { error: (issue) => (issue.input === undefined ? 'Pilih divisi' : 'Divisi tidak valid') }
  ),
  noHp: z
    .string()
    .min(9, 'Nomor HP tidak valid')
    .max(15, 'Nomor HP tidak valid')
    .regex(/^(08|628)[0-9]+$/, 'Format nomor harus diawali 08 atau 628'),
})

export type DataPengajuValues = z.infer<typeof dataPengajuSchema>

export const itemBarangSchema = z.object({
  namaBarang: z.string().min(2, 'Nama barang minimal 2 karakter').max(150),
  qty: z
    .string()
    .min(1, 'Qty wajib diisi')
    .regex(/^\d+$/, 'Qty harus berupa angka')
    .refine((v) => Number(v) > 0, 'Qty harus lebih dari 0'),
  hargaSatuan: z
    .string()
    .min(1, 'Harga satuan wajib diisi')
    .regex(/^\d+$/, 'Harga harus berupa angka')
    .refine((v) => Number(v) > 0, 'Harga harus lebih dari 0'),
})

export const itemBarangArraySchema = z
  .array(itemBarangSchema)
  .min(1, 'Minimal 1 barang/kebutuhan harus diisi')

export type ItemBarangValues = z.infer<typeof itemBarangSchema>

export function createEmptyItem(): ItemBarangValues {
  return { namaBarang: '', qty: '', hargaSatuan: '' } as ItemBarangValues
}

export const prosesPengajuanSchema = z
  .object({
    aksi: z.enum(['DISETUJUI', 'DITOLAK']),
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

export type ProsesPengajuanValues = z.infer<typeof prosesPengajuanSchema>

export const editItemsApiSchema = z.object({
  items: z
    .array(
      z.object({
        namaBarang: z.string().min(2, 'Nama barang minimal 2 karakter').max(150),
        qty: z.number().int().min(1, 'Qty minimal 1'),
        hargaSatuan: z.number().int().min(0, 'Harga tidak boleh negatif'),
      })
    )
    .min(1, 'Minimal 1 barang harus ada'),
})

export type EditItemsApiValues = z.infer<typeof editItemsApiSchema>