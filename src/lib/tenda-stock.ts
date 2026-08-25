import { Prisma, StatusPembayaran } from '@prisma/client'
import { TENDA_RESERVASI_JAM } from '@/lib/constants-sekolah'

type PilihanTenda = { tendaJenisId: string; jumlah: number }

export function batasReservasiTenda(sekarang = new Date()): Date {
  return new Date(sekarang.getTime() - TENDA_RESERVASI_JAM * 60 * 60 * 1000)
}

export function reservasiTendaAktif(
  pembayaran: { statusPembayaran: StatusPembayaran; updatedAt: Date } | undefined,
  batasReservasi: Date
): boolean {
  return Boolean(
    pembayaran &&
      pembayaran.statusPembayaran !== 'DITOLAK' &&
      (pembayaran.statusPembayaran !== 'BELUM_BAYAR' || pembayaran.updatedAt >= batasReservasi)
  )
}

/**
 * Mengunci baris jenis tenda dan mengecek stok terbaru dalam transaksi yang
 * sama. Pemanggil wajib menyimpan pilihan sebelum transaksi selesai.
 */
export async function lockDanValidasiStokTenda(
  tx: Prisma.TransactionClient,
  sekolahId: string,
  pilihan: PilihanTenda[],
  reservasiId?: string
): Promise<void> {
  const tendaIds = pilihan.map((item) => item.tendaJenisId)
  const batasReservasi = batasReservasiTenda()

  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM tenda_jenis WHERE id IN (${Prisma.join(tendaIds)}) FOR UPDATE`
  )

  const semuaSewa = await tx.tendaSewa.findMany({
    where: { tendaJenisId: { in: tendaIds }, sekolahId: { not: sekolahId } },
    select: {
      tendaJenisId: true,
      jumlah: true,
      sekolah: {
        select: {
          pembayaran: {
            where: { tipe: 'TENDA', batchKe: 1 },
            select: { statusPembayaran: true, updatedAt: true },
          },
        },
      },
    },
  })

  const terpakai = new Map<string, number>()
  for (const sewa of semuaSewa) {
    if (!reservasiTendaAktif(sewa.sekolah.pembayaran[0], batasReservasi)) continue
    terpakai.set(sewa.tendaJenisId, (terpakai.get(sewa.tendaJenisId) ?? 0) + sewa.jumlah)
  }

  const reservasiAktif = await tx.reservasiTendaItem.findMany({
    where: { tendaJenisId: { in: tendaIds }, ...(reservasiId ? { reservasiId: { not: reservasiId } } : {}), reservasi: { expiresAt: { gt: new Date() } } },
    select: { tendaJenisId: true, jumlah: true },
  })
  for (const item of reservasiAktif) terpakai.set(item.tendaJenisId, (terpakai.get(item.tendaJenisId) ?? 0) + item.jumlah)

  const jenisTenda = await tx.tendaJenis.findMany({ where: { id: { in: tendaIds } } })
  for (const item of pilihan) {
    const jenis = jenisTenda.find((tenda) => tenda.id === item.tendaJenisId)
    if (!jenis) throw new Error('TENDA_TIDAK_DITEMUKAN')

    const stokTersisa = jenis.stokTotal - (terpakai.get(item.tendaJenisId) ?? 0)
    if (item.jumlah > stokTersisa) throw new Error(`STOK_HABIS:${jenis.nama}:${Math.max(stokTersisa, 0)}`)
  }
}
