import { z } from 'zod'
import { pesertaItemSchema, pendampingArraySchema } from './peserta'

/**
 * Skema payload untuk POST /api/sekolah/[id]/susulan.
 * Beda dari pendaftaran awal: peserta susulan BOLEH 0 (kalau yang susulan
 * cuma pendamping), tapi total peserta+pendamping baru minimal 1 — kalau 0
 * dua-duanya, tidak ada gunanya submit susulan.
 *
 * CATATAN: pesertaMetaArraySchema (dipakai di pendaftaran awal) punya
 * .min(1) bawaan yang tidak bisa "dihapus" lagi lewat .min(0) — di Zod,
 * setiap .min() menambah check baru, bukan menggantikan yang lama. Jadi di
 * sini skema dibangun ulang dari pesertaItemSchema (tanpa field `foto`,
 * karena payload susulan dikirim sebagai JSON + file foto terpisah, sama
 * seperti pendaftaran awal).
 */
export const susulanPesertaArraySchema = z
  .array(pesertaItemSchema.omit({ foto: true }))
  .max(60, 'Maksimal 60 peserta per batch susulan')

export const susulanPayloadSchema = z
  .object({
    peserta: susulanPesertaArraySchema,
    pendamping: pendampingArraySchema,
  })
  .refine((data) => data.peserta.length + data.pendamping.length > 0, {
    message: 'Minimal 1 peserta atau pendamping susulan harus diisi',
    path: ['peserta'],
  })

export type SusulanPayloadValues = z.infer<typeof susulanPayloadSchema>

/** Normalisasi nomor WA supaya "0812...", "62812...", "+62812..." dianggap sama */
export function normalizeNoWa(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.startsWith('62')) return `0${digits.slice(2)}`
  if (digits.startsWith('0')) return digits
  return `0${digits}`
}