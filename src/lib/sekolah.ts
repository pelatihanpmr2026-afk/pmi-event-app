import { prisma } from './prisma'
import type { Jenjang, StatusSekolah, KategoriSekolah } from '@prisma/client'

const PREFIX_MAP: Record<Jenjang, Record<StatusSekolah, string>> = {
  SMP: { NEGERI: 'SMPN', SWASTA: 'SMPS' },
  MTS: { NEGERI: 'MTsN', SWASTA: 'MTs' },
  SMA: { NEGERI: 'SMAN', SWASTA: 'SMAS' },
  SMK: { NEGERI: 'SMKN', SWASTA: 'SMKS' },
  MA: { NEGERI: 'MAN', SWASTA: 'MAS' },
}

const REDUNDANT_WORDS = new Set([
  'smp', 'smpn', 'smps',
  'mts', 'mtsn', 'mtss',
  'sma', 'sman', 'smas',
  'smk', 'smkn', 'smks',
  'ma', 'man', 'mas',
  'negeri', 'swasta', 'neg', 'swt',
])

/**
 * Normalisasi nilai yang disimpan: kapital seluruhnya dan satu spasi antar kata.
 * Istilah seperti "NEGERI", "N", atau "SMKN" sengaja tidak diubah agar
 * nama resmi yang diinput pengguna tetap terjaga.
 */
export function normalizeNamaSekolah(namaSekolah: string): string
export function normalizeNamaSekolah(jenjang: Jenjang, statusSekolah: StatusSekolah, namaInput: string): string
export function normalizeNamaSekolah(
  namaSekolahOrJenjang: string | Jenjang,
  statusSekolah?: StatusSekolah,
  namaInput?: string
): string {
  if (statusSekolah && namaInput !== undefined) {
    const prefix = PREFIX_MAP[namaSekolahOrJenjang as Jenjang][statusSekolah]
    return `${prefix} ${stripRedundantPrefix(namaInput)}`.trim()
  }

  const namaSekolah = namaSekolahOrJenjang
  return namaSekolah
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('id-ID')
}

/** Membersihkan awalan jenjang/status yang terketik ulang pada alur lama. */
export function stripRedundantPrefix(input: string): string {
  const tokens = input.trim().split(/\s+/)

  while (tokens.length > 0) {
    const first = tokens[0].toLowerCase().replace(/[^a-z]/g, '')
    if (REDUNDANT_WORDS.has(first)) {
      tokens.shift()
    } else {
      break
    }
  }

  return tokens.join(' ').trim()
}

/**
 * Kunci pembanding untuk mendeteksi nama sekolah yang sama tanpa mengubah
 * nama tersimpan. Variasi awalan sekolah negeri diperlakukan setara:
 * "SMK NEGERI 1", "SMK N 1", dan "SMKN 1" menghasilkan kunci yang sama.
 */
export function namaSekolahKey(namaSekolah: string): string {
  return normalizeNamaSekolah(namaSekolah)
    .replace(/\b(SMP|SMA|SMK|MTS|MA)\s+(?:NEGERI|N)\b/g, '$1')
    .replace(/\b(SMP|SMA|SMK|MTS|MA)N\b/g, '$1')
}

export function deriveKategori(jenjang: Jenjang): KategoriSekolah {
  return jenjang === 'SMP' || jenjang === 'MTS' ? 'MADYA' : 'WIRA'
}

async function findNomorUrutKosong(kategori: KategoriSekolah, tahun: number): Promise<number> {
  const semuaSekolah = await prisma.sekolah.findMany({
    where: {
      kategori,
      tahunPendaftaran: tahun,
    },
    select: {
      nomorPendaftaran: true,
      pembayaran: {
        where: { tipe: 'PESERTA' },
        orderBy: { batchKe: 'asc' },
        select: { statusPembayaran: true },
      },
    },
    orderBy: { nomorPendaftaran: 'asc' },
  })

  // Sekolah yang pembayaran pesertanya DITOLAK dianggap membebaskan nomornya kembali,
  // sama seperti sekolah yang dihapus — jadi tidak dihitung sebagai nomor terpakai.
  const nomorSet = new Set(
    semuaSekolah
      .filter((s) => s.pembayaran[0]?.statusPembayaran !== 'DITOLAK')
      .map((s) => s.nomorPendaftaran)
  )

  let nomor = 1
  while (nomorSet.has(nomor)) {
    nomor++
  }

  return nomor
}

export async function generateKodePendaftaran(
  namaLengkap: string,
  kategori: KategoriSekolah,
  tahun: number = new Date().getFullYear()
): Promise<{ nomorPendaftaran: number; tahunPendaftaran: number; kodePendaftaran: string }> {
  const nomorPendaftaran = await findNomorUrutKosong(kategori, tahun)
  const nomorFormatted = String(nomorPendaftaran).padStart(3, '0')
  const kodeKategori = kategori === 'WIRA' ? 'WR' : 'MD'
  const bulan = String(new Date().getMonth() + 1).padStart(2, '0')
  // Format terbaca: 001-WR.08.2026 (nomor urut-kategori.bulan daftar.tahun daftar).
  // Unik karena nomorPendaftaran berurutan per kategori per tahun.
  const kodePendaftaran = `${nomorFormatted}-${kodeKategori}.${bulan}.${tahun}`

  return { nomorPendaftaran, tahunPendaftaran: tahun, kodePendaftaran }
}

export function sanitizeFilename(input: string): string {
  return input
    .trim()
    .replace(/[\\/:*?"<>|]/g, '') // karakter terlarang di filename Windows
    .replace(/\s+/g, '_')
}
