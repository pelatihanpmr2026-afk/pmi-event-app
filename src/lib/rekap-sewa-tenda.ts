import { prisma } from './prisma'

export interface RekapSewaTendaRow {
  kodePendaftaran: string | null
  namaSekolah: string
  tenda: { nama: string; jumlah: number }[]
  totalUnit: number
  totalBiaya: number
}

export interface RekapSewaTendaData {
  wira: RekapSewaTendaRow[]
  madya: RekapSewaTendaRow[]
}

/**
 * Rekap sewa tenda per kategori sekolah (WIRA / MADYA).
 *
 * - Hanya sekolah yang punya sewa tenda DENGAN pembayaran TENDA LUNAS
 *   (konsisten dengan daftar "Sekolah yang Sewa Tenda" di dashboard tenda).
 * - Satu baris per sekolah, memuat rincian tenda, total unit, dan total biaya
 *   (ambil dari pembayaran TENDA yang dikonfirmasi).
 */
export async function getRekapSewaTenda(): Promise<RekapSewaTendaData> {
  const sekolahList = await prisma.sekolah.findMany({
    where: {
      tendaSewa: { some: {} },
      pembayaran: { some: { tipe: 'TENDA', statusPembayaran: 'LUNAS' } },
    },
    include: {
      tendaSewa: { include: { tendaJenis: { select: { nama: true } } } },
      pembayaran: {
        where: { tipe: 'TENDA', statusPembayaran: 'LUNAS' },
        orderBy: { dikonfirmasiPada: 'desc' },
      },
    },
    orderBy: { namaLengkap: 'asc' },
  })

  const wira: RekapSewaTendaRow[] = []
  const madya: RekapSewaTendaRow[] = []

  for (const s of sekolahList) {
    const row: RekapSewaTendaRow = {
      kodePendaftaran: s.kodePendaftaran,
      namaSekolah: s.namaLengkap,
      tenda: s.tendaSewa.map((tenda) => ({ nama: tenda.tendaJenis.nama, jumlah: tenda.jumlah })),
      totalUnit: s.tendaSewa.reduce((sum, tenda) => sum + tenda.jumlah, 0),
      totalBiaya: s.pembayaran[0]?.jumlahBiaya ?? 0,
    }
    if (s.kategori === 'WIRA') wira.push(row)
    else madya.push(row)
  }

  return { wira, madya }
}