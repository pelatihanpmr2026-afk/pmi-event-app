import { prisma } from './prisma'

export interface RekapTendaRow {
  no: number
  namaSekolah: string
  kodePendaftaran: string
  tenda: { nama: string; jumlah: number }[]
  totalUnit: number
  totalRp: number
}

export interface RekapTendaData {
  rows: RekapTendaRow[]
  totalUnit: number
  totalRp: number
}

/**
 * Rekap harian sewa tenda.
 *
 * - Berdasarkan tanggal TendaSewa dibuat.
 * - Termasuk pembayaran LUNAS dan MENUNGGU_KONFIRMASI (bukti sudah dikirim).
 * - Dikelompokkan per sekolah: 1 baris memuat 1 atau lebih tenda yang disewa,
 *   nama sekolah tidak ditulis berulang.
 */
export async function getRekapTendaData(start: Date, end: Date): Promise<RekapTendaData> {
  const sewaList = await prisma.tendaSewa.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      sekolah: {
        pembayaran: {
          some: {
            tipe: 'TENDA',
            statusPembayaran: { in: ['LUNAS', 'MENUNGGU_KONFIRMASI'] },
          },
        },
      },
    },
    include: {
      sekolah: { select: { namaLengkap: true, kodePendaftaran: true } },
      tendaJenis: { select: { nama: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const rows: RekapTendaRow[] = []
  const idxBySekolah = new Map<string, number>()

  for (const sewa of sewaList) {
    let idx = idxBySekolah.get(sewa.sekolahId)
    if (idx === undefined) {
      rows.push({
        no: rows.length + 1,
        namaSekolah: sewa.sekolah.namaLengkap,
        kodePendaftaran: sewa.sekolah.kodePendaftaran,
        tenda: [],
        totalUnit: 0,
        totalRp: 0,
      })
      idx = rows.length - 1
      idxBySekolah.set(sewa.sekolahId, idx)
    }
    const row = rows[idx]
    row.tenda.push({ nama: sewa.tendaJenis.nama, jumlah: sewa.jumlah })
    row.totalUnit += sewa.jumlah
    row.totalRp += sewa.jumlah * sewa.hargaSatuanSaatSewa
  }

  const totalUnit = rows.reduce((sum, r) => sum + r.totalUnit, 0)
  const totalRp = rows.reduce((sum, r) => sum + r.totalRp, 0)

  return { rows, totalUnit, totalRp }
}