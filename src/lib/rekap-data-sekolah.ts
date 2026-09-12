import { prisma } from './prisma'

export interface RekapDataSekolahRow {
  nomorPendaftaran: number | null
  namaSekolah: string
  jumlahPeserta: number
  jumlahPendamping: number
}

export interface RekapDataSekolahTotals {
  totalSekolahWira: number
  totalSekolahMadya: number
  totalPesertaWira: number
  totalPesertaMadya: number
  totalPendampingWira: number
  totalPendampingMadya: number
}

export interface RekapDataSekolahData {
  wira: RekapDataSekolahRow[]
  madya: RekapDataSekolahRow[]
  totals: RekapDataSekolahTotals
}

/**
 * Rekap data sekolah: seluruh sekolah yang terdaftar resmi (memiliki nomor
 * pendaftaran), dipisah berdasarkan kategori PMR (WIRA / MADYA), lengkap
 * dengan jumlah peserta dan pendamping per sekolah.
 */
export async function getRekapDataSekolah(): Promise<RekapDataSekolahData> {
  const sekolahList = await prisma.sekolah.findMany({
    where: { nomorPendaftaran: { not: null } },
    include: { peserta: { select: { tipe: true } } },
    orderBy: { nomorPendaftaran: 'asc' },
  })

  const wira: RekapDataSekolahRow[] = []
  const madya: RekapDataSekolahRow[] = []
  let totalPesertaWira = 0
  let totalPesertaMadya = 0
  let totalPendampingWira = 0
  let totalPendampingMadya = 0

  for (const s of sekolahList) {
    const jumlahPeserta = s.peserta.filter((p) => p.tipe === 'PESERTA').length
    const jumlahPendamping = s.peserta.filter((p) => p.tipe === 'PENDAMPING').length
    const row: RekapDataSekolahRow = {
      nomorPendaftaran: s.nomorPendaftaran,
      namaSekolah: s.namaLengkap,
      jumlahPeserta,
      jumlahPendamping,
    }
    if (s.kategori === 'WIRA') {
      wira.push(row)
      totalPesertaWira += jumlahPeserta
      totalPendampingWira += jumlahPendamping
    } else {
      madya.push(row)
      totalPesertaMadya += jumlahPeserta
      totalPendampingMadya += jumlahPendamping
    }
  }

  return {
    wira,
    madya,
    totals: {
      totalSekolahWira: wira.length,
      totalSekolahMadya: madya.length,
      totalPesertaWira,
      totalPesertaMadya,
      totalPendampingWira,
      totalPendampingMadya,
    },
  }
}