import { prisma } from './prisma'
import type { Jenjang, StatusSekolah, KategoriSekolah } from '@prisma/client'

const PREFIX_MAP: Record<Jenjang, Record<StatusSekolah, string>> = {
  SMP: { NEGERI: 'SMPN', SWASTA: 'SMPS' },
  MTS: { NEGERI: 'MTsN', SWASTA: 'MTs' },
  SMA: { NEGERI: 'SMAN', SWASTA: 'SMAS' },
  SMK: { NEGERI: 'SMKN', SWASTA: 'SMKS' },
  MA: { NEGERI: 'MAN', SWASTA: 'MAS' },
}

// Semua variasi kata jenjang & status yang mungkin diketik ulang user
// secara tidak sengaja, walau sudah dipilih lewat dropdown.
const REDUNDANT_WORDS = new Set([
  'smp', 'smpn', 'smps',
  'mts', 'mtsn', 'mtss',
  'sma', 'sman', 'smas',
  'smk', 'smkn', 'smks',
  'ma', 'man', 'mas',
  'negeri', 'swasta', 'neg', 'swt',
])

/**
 * Menghapus kata jenjang/status yang keketik ulang di AWAL input user
 * (mis. "SMA Negeri 1 Cianjur" -> "1 Cianjur"), supaya tidak dobel
 * dengan prefix yang sudah otomatis ditambahkan dari pilihan dropdown.
 * Hanya membersihkan token di awal, bukan di tengah/akhir kalimat
 * (supaya nama sekolah yang kebetulan mengandung kata serupa di
 * bagian belakang tidak ikut terpotong, misal "SMA Terpadu Al Ma'arif").
 */
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

export function normalizeNamaSekolah(
  jenjang: Jenjang,
  statusSekolah: StatusSekolah,
  namaInput: string
): string {
  const prefix = PREFIX_MAP[jenjang][statusSekolah]
  const cleanedInput = stripRedundantPrefix(namaInput).replace(/\s+/g, ' ')
  return `${prefix} ${cleanedInput}`.trim()
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
  const namaSekolahFormatted = namaLengkap
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
  const kodePendaftaran = `${nomorFormatted}${kategori}PMR${tahun}_${namaSekolahFormatted}`

  return { nomorPendaftaran, tahunPendaftaran: tahun, kodePendaftaran }
}

export function sanitizeFilename(input: string): string {
  return input
    .trim()
    .replace(/[\\/:*?"<>|]/g, '') // karakter terlarang di filename Windows
    .replace(/\s+/g, '_')
}