import { z } from 'zod'
import { ACCEPTED_FOTO_TYPES, MAX_FOTO_SIZE } from '@/lib/constants'

const TANGGAL_LAHIR_MIN = '1900-01-01'
const TANGGAL_HARI_INI = new Date().toISOString().slice(0, 10)

export function normalizeNamaPeserta(nama: string): string {
  return nama.trim().replace(/\s+/g, ' ').toLocaleUpperCase('id-ID')
}

const tanggalLahirSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal lahir harus berformat YYYY-MM-DD')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day &&
      value >= TANGGAL_LAHIR_MIN &&
      value <= TANGGAL_HARI_INI
    )
  }, 'Tanggal lahir tidak valid')

const baseItemSchema = z.object({
  namaLengkap: z.string().min(3, 'Nama minimal 3 karakter').max(100, 'Nama maksimal 100 karakter'),
  tempatLahir: z.string().min(2, 'Tempat lahir wajib diisi').max(100),
  tanggalLahir: tanggalLahirSchema,
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
  .max(60, 'Maksimal 60 peserta per pendaftaran')

export const pendampingArraySchema = z.array(baseItemSchema).max(30, 'Maksimal 30 pendamping per pendaftaran')

export const pesertaPendampingSchema = z.object({
  peserta: z.array(pesertaItemSchema).min(1, 'Minimal 1 peserta harus didaftarkan'),
  pendamping: z.array(pendampingItemSchema),
})

/**
 * Skema KHUSUS untuk step "Data Peserta".
 * Sengaja dipisah dari pesertaPendampingSchema karena step ini hanya punya
 * data peserta di form-nya (data pendamping belum diisi di step ini).
 * Kalau dulu pakai pesertaPendampingSchema langsung, field `pendamping`
 * ikut divalidasi padahal belum ada datanya sama sekali di step ini.
 */
export const pesertaOnlySchema = z.object({
  peserta: z.array(pesertaItemSchema).min(1, 'Minimal 1 peserta harus didaftarkan'),
})

/**
 * Skema KHUSUS untuk step "Data Pendamping".
 * Sengaja dipisah dari pesertaPendampingSchema karena step ini hanya punya
 * data pendamping di form-nya (data peserta sudah diisi di step sebelumnya
 * dan disimpan di state parent, bukan di form step ini).
 *
 * BUG LAMA: sebelum dipisah, step ini pakai pesertaPendampingSchema penuh,
 * padahal field `peserta` di form step ini SELALU [] (kosong, hardcoded).
 * Karena pesertaPendampingSchema mewajibkan peserta.min(1), maka form ini
 * TIDAK PERNAH bisa valid sama sekali → tombol "Lanjut ke Review" selalu
 * disabled, apapun yang diisi user di data pendamping.
 */
export const pendampingOnlySchema = z.object({
  pendamping: z.array(pendampingItemSchema),
})

export type PesertaItemValues = z.infer<typeof pesertaItemSchema>
export type PendampingItemValues = z.infer<typeof pendampingItemSchema>
export type PesertaPendampingValues = z.infer<typeof pesertaPendampingSchema>
export type PesertaOnlyValues = z.infer<typeof pesertaOnlySchema>
export type PendampingOnlyValues = z.infer<typeof pendampingOnlySchema>

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
