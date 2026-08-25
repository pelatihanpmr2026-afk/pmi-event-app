import { prisma } from './prisma'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from './constants-sekolah'

export interface RekapPendaftaranRow {
  namaSekolah: string
  jumlahPeserta: number
  jumlahPendamping: number
  totalRp: number
}

export interface RekapTendaRow {
  namaSekolah: string
  namaTenda: string
  jumlahTenda: number
  totalRp: number
}

export interface RekapPendaftaranData {
  pendaftaran: RekapPendaftaranRow[]
  tenda: RekapTendaRow[]
  totalJumlahPeserta: number
  totalJumlahPendamping: number
  totalJumlahTenda: number
  totalPendaftaran: number
  totalSewaTenda: number
  totalKeseluruhan: number
}

/**
 * Rekap harian pendaftaran.
 *
 * - Pendaftaran: sekolah yang TERDAFTAR pada tanggal tsb (batch asli, batchKe 1)
 *   DITAMBAH peserta/pendamping SUSULAN yang dibuat pada tanggal tsb
 *   (batchKe > 1). Susulan masuk ke rekap pada tanggal penambahan, BUKAN
 *   tanggal pendaftaran awal sekolah.
 * - Sewa tenda: berdasarkan tanggal TendaSewa dibuat (hanya LUNAS).
 */
export async function getRekapPendaftaranData(start: Date, end: Date): Promise<RekapPendaftaranData> {
  const [sekolahDaftar, susulanPeserta, tendaSewaHariIni] = await Promise.all([
    prisma.sekolah.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        pembayaran: { some: { tipe: 'PESERTA', statusPembayaran: 'LUNAS' } },
      },
      include: { peserta: { select: { tipe: true, batchKe: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.peserta.findMany({
      where: {
        batchKe: { gt: 1 },
        createdAt: { gte: start, lte: end },
        sekolah: { pembayaran: { some: { tipe: 'PESERTA', statusPembayaran: 'LUNAS' } } },
      },
      select: { tipe: true, sekolahId: true, sekolah: { select: { namaLengkap: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.tendaSewa.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        sekolah: { pembayaran: { some: { tipe: 'TENDA', statusPembayaran: 'LUNAS' } } },
      },
      include: { sekolah: { select: { namaLengkap: true } }, tendaJenis: { select: { nama: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const pendaftaran: RekapPendaftaranRow[] = []
  const idxBySekolah = new Map<string, number>()

  function tambahRow(sekolahId: string, namaSekolah: string, tipe?: 'PESERTA' | 'PENDAMPING') {
    let idx = idxBySekolah.get(sekolahId)
    if (idx === undefined) {
      pendaftaran.push({ namaSekolah, jumlahPeserta: 0, jumlahPendamping: 0, totalRp: 0 })
      idx = pendaftaran.length - 1
      idxBySekolah.set(sekolahId, idx)
    }
    const row = pendaftaran[idx]
    if (tipe === 'PESERTA') row.jumlahPeserta++
    else if (tipe === 'PENDAMPING') row.jumlahPendamping++
    row.totalRp = row.jumlahPeserta * BIAYA_PESERTA + row.jumlahPendamping * BIAYA_PENDAMPING
    return row
  }

  // Batch asli (batchKe 1): atribut ke tanggal pendaftaran sekolah.
  for (const s of sekolahDaftar) {
    const row = tambahRow(s.id, s.namaLengkap)
    row.jumlahPeserta = s.peserta.filter((p) => p.tipe === 'PESERTA' && p.batchKe === 1).length
    row.jumlahPendamping = s.peserta.filter((p) => p.tipe === 'PENDAMPING' && p.batchKe === 1).length
    row.totalRp = row.jumlahPeserta * BIAYA_PESERTA + row.jumlahPendamping * BIAYA_PENDAMPING
  }

  // Susulan (batchKe > 1): atribut ke tanggal peserta susulan dibuat.
  for (const p of susulanPeserta) {
    tambahRow(p.sekolahId, p.sekolah.namaLengkap, p.tipe)
  }

  const tenda = tendaSewaHariIni.map((t) => ({
    namaSekolah: t.sekolah.namaLengkap,
    namaTenda: t.tendaJenis.nama,
    jumlahTenda: t.jumlah,
    totalRp: t.jumlah * t.hargaSatuanSaatSewa,
  }))

  const totalJumlahPeserta = pendaftaran.reduce((s, r) => s + r.jumlahPeserta, 0)
  const totalJumlahPendamping = pendaftaran.reduce((s, r) => s + r.jumlahPendamping, 0)
  const totalPendaftaran = pendaftaran.reduce((s, r) => s + r.totalRp, 0)
  const totalJumlahTenda = tenda.reduce((s, r) => s + r.jumlahTenda, 0)
  const totalSewaTenda = tenda.reduce((s, r) => s + r.totalRp, 0)

  return {
    pendaftaran,
    tenda,
    totalJumlahPeserta,
    totalJumlahPendamping,
    totalJumlahTenda,
    totalPendaftaran,
    totalSewaTenda,
    totalKeseluruhan: totalPendaftaran + totalSewaTenda,
  }
}