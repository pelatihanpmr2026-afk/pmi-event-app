import { z } from 'zod'
import { ACCEPTED_FOTO_TYPES, MAX_FOTO_SIZE } from '@/lib/constants'

export const panitiaBiodataSchema = z.object({
  nama: z
    .string()
    .min(3, 'Nama minimal 3 karakter')
    .max(100, 'Nama maksimal 100 karakter'),
  gender: z.enum(['LAKI_LAKI', 'PEREMPUAN'], {
    error: (issue) => (issue.input === undefined ? 'Pilih jenis kelamin' : 'Jenis kelamin tidak valid'),
  }),
  noWhatsapp: z
    .string()
    .min(9, 'Nomor WhatsApp tidak valid')
    .max(15, 'Nomor WhatsApp tidak valid')
    .regex(/^(08|628)[0-9]+$/, 'Format nomor harus diawali 08 atau 628'),
  alamat: z
    .string()
    .min(10, 'Alamat minimal 10 karakter')
    .max(255, 'Alamat maksimal 255 karakter'),
})

export const panitiaKeanggotaanSchema = z.object({
  asalUnit: z.enum(['KSR_MARKAS', 'KSR_UNSUR', 'KSR_UNPI', 'FORPIS'], {
    error: (issue) => (issue.input === undefined ? 'Pilih asal unit' : 'Asal unit tidak valid'),
  }),
  divisi: z.enum(
    [
      'KOMANDAN', 'KETUA_PELAKSANA', 'WAKIL_KETUA', 'BENDAHARA',
      'WAKIL_BENDAHARA_1', 'WAKIL_BENDAHARA_2', 'SEKRETARIS', 'WAKIL_SEKRETARIS',
      'KESEKRETARIATAN', 'ACARA', 'HUMAS_DAN_DOKUMENTASI', 'GIAT',
      'KEAMANAN_DAN_EVAKUASI', 'SANITASI', 'TRANSPORTASI', 'PERKEMAHAN',
      'DAPUR_UMUM', 'PERALATAN', 'YANKES',
    ],
    {
      error: (issue) => (issue.input === undefined ? 'Pilih divisi' : 'Divisi tidak valid'),
    }
  ),
})

export const panitiaFotoSchema = z.object({
  foto: z
    .instanceof(File, { error: 'Foto wajib diupload' })
    .refine((file) => file.size <= MAX_FOTO_SIZE, 'Ukuran foto maksimal 5MB')
    .refine(
      (file) => ACCEPTED_FOTO_TYPES.includes(file.type),
      'Format foto harus JPG atau PNG'
    ),
})

export const panitiaFormSchema = panitiaBiodataSchema
  .merge(panitiaKeanggotaanSchema)
  .merge(panitiaFotoSchema)

export type PanitiaFormValues = z.infer<typeof panitiaFormSchema>

// Skema khusus server (foto divalidasi terpisah di API karena FormData berbeda dengan File instance browser)
export const panitiaServerSchema = panitiaBiodataSchema.merge(panitiaKeanggotaanSchema)
export type PanitiaServerValues = z.infer<typeof panitiaServerSchema>

// Nominal perdiem (insentif panitia) — diinput manual oleh admin via dashboard.
export const perdiemSchema = z.object({
  perdiem: z.number().int('Nominal perdiem harus bilangan bulat').min(0, 'Nominal perdiem minimal 0').max(999999999, 'Nominal perdiem terlalu besar'),
})
export type PerdiemValues = z.infer<typeof perdiemSchema>

// Perdiem massal: nominal per hari/sesi dikali jumlah kehadiran tiap panitia.
// Daftar id menentukan cakupan (mengikuti filter aktif di dashboard).
export const perdiemBulkSchema = z.object({
  nominalPerHari: z.number().int('Nominal per hari harus bilangan bulat').min(0, 'Nominal per hari minimal 0').max(999999999, 'Nominal per hari terlalu besar'),
  ids: z.array(z.string().min(1)).min(1, 'Minimal 1 panitia dipilih').max(5000, 'Maksimal 5000 panitia sekaligus'),
})
export type PerdiemBulkValues = z.infer<typeof perdiemBulkSchema>