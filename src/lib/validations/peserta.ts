import { z } from 'zod'
import { ACCEPTED_FOTO_TYPES, MAX_FOTO_SIZE } from '@/lib/constants'

const baseItemSchema = z.object({
  namaLengkap: z.string().min(3, 'Nama minimal 3 karakter').max(100, 'Nama maksimal 100 karakter'),
  tempatLahir: z.string().min(2, 'Tempat lahir wajib diisi').max(100),
  tanggalLahir: z.string().min(1, 'Tanggal lahir wajib diisi'),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter').max(255, 'Alamat maksimal 255 karakter'),
  agama: z.enum(['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA'], {
    error: (issue) => (issue.input === undefined ? 'Pilih agama' : 'Agama tidak valid'),
  }),
  golonganDarah: z.enum(['A', 'B', 'AB', 'O', 'TIDAK_TAHU'], {
    error: (issue) => (issue.input === undefined ? 'Pilih golongan darah' : 'Golongan darah tidak valid'),
  }),
  tahunMasuk: z
  .string()
  .min(1, 'Tahun masuk wajib diisi')
  .regex(/^\d{4}$/, 'Tahun harus 4 digit angka')
  .refine((val) => {
    const num = Number(val)
    return num >= 2000 && num <= new Date().getFullYear()
  }, `Tahun harus antara 2000 - ${new Date().getFullYear()}`),
  noHp: z.string().max(15, 'Nomor HP maksimal 15 digit').optional().or(z.literal('')),
  gender: z.enum(['LAKI_LAKI', 'PEREMPUAN'], {
    error: (issue) => (issue.input === undefined ? 'Pilih jenis kelamin' : 'Jenis kelamin tidak valid'),
  }),
})

export const pesertaItemSchema = baseItemSchema.extend({
  foto: z
    .instanceof(File, { error: 'Foto peserta wajib diupload' })
    .refine((file) => file.size <= MAX_FOTO_SIZE, 'Ukuran foto maksimal 5MB')
    .refine((file) => ACCEPTED_FOTO_TYPES.includes(file.type), 'Format foto harus JPG atau PNG'),
  riwayatPenyakit: z.enum(
    [
      'TIDAK_ADA', 'ASMA_BERAT', 'EPILEPSI', 'JANTUNG', 'DIABETES', 'HIPERTENSI_BERAT',
      'GANGGUAN_GINJAL', 'GANGGUAN_PERNAPASAN_KRONIS', 'RIWAYAT_KEJANG', 'HEMOFILIA',
      'ANEMIA_BERAT', 'LAINNYA',
    ],
    { error: (issue) => (issue.input === undefined ? 'Pilih riwayat penyakit' : 'Pilihan tidak valid') }
  ),
})

export const pendampingItemSchema = baseItemSchema

const pesertaMetaSchema = baseItemSchema.extend({
  riwayatPenyakit: z.enum([
    'TIDAK_ADA', 'ASMA_BERAT', 'EPILEPSI', 'JANTUNG', 'DIABETES', 'HIPERTENSI_BERAT',
    'GANGGUAN_GINJAL', 'GANGGUAN_PERNAPASAN_KRONIS', 'RIWAYAT_KEJANG', 'HEMOFILIA',
    'ANEMIA_BERAT', 'LAINNYA',
  ]),
})

export const pesertaMetaArraySchema = z
  .array(pesertaMetaSchema)
  .min(1, 'Minimal 1 peserta harus didaftarkan')

export const pendampingArraySchema = z.array(baseItemSchema)

export const pesertaPendampingSchema = z.object({
  peserta: z.array(pesertaItemSchema).min(1, 'Minimal 1 peserta harus didaftarkan'),
  pendamping: z.array(pendampingItemSchema),
})

export type PesertaItemValues = z.infer<typeof pesertaItemSchema>
export type PendampingItemValues = z.infer<typeof pendampingItemSchema>
export type PesertaPendampingValues = z.infer<typeof pesertaPendampingSchema>

export function createEmptyPeserta(): PesertaItemValues {
  return {
    namaLengkap: '',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
    noHp: '',
  } as PesertaItemValues
}

export function createEmptyPendamping(): PendampingItemValues {
  return {
    namaLengkap: '',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
    noHp: '',
  } as PendampingItemValues
}