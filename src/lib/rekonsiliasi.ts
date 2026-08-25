import { prisma } from './prisma'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from './constants-sekolah'

export interface MismatchItem {
  pembayaranId: string
  sekolahId: string
  namaSekolah: string
  tipe: 'PESERTA' | 'TENDA'
  batchKe: number
  statusPembayaran: string
  jumlahBiaya: number
  jumlahSeharusnya: number
  selisih: number
}

/**
 * Rekonsiliasi: bandingkan jumlahBiaya tersimpan di Pembayaran dengan jumlah
 * yang dihitung ulang dari baris data aktual di DB.
 *
 * - PESERTA:  (jumlah peserta batch × BIAYA_PESERTA) + (jumlah pendamping batch × BIAYA_PENDAMPING)
 * - TENDA:     Σ(jumlah tenda × hargaSatuanSaatSewa) per sekolah
 *
 * Jumlah tersimpan adalah snapshot saat submit; jika baris peserta/order tenda
 * diubah di luar jalur resmi, keduanya bisa melenceng (B2).
 */
export async function cekRekonsiliasiPembayaran(): Promise<MismatchItem[]> {
  const [pembayaranList, pesertaList, tendaSewaList] = await Promise.all([
    prisma.pembayaran.findMany({
      where: { statusPembayaran: { in: ['LUNAS', 'MENUNGGU_KONFIRMASI'] } },
      include: { sekolah: { select: { namaLengkap: true } } },
    }),
    prisma.peserta.findMany({
      select: { sekolahId: true, batchKe: true, tipe: true },
    }),
    prisma.tendaSewa.findMany({
      select: { sekolahId: true, jumlah: true, hargaSatuanSaatSewa: true },
    }),
  ])

  const pesertaCount = new Map<string, { PESERTA: number; PENDAMPING: number }>()
  for (const p of pesertaList) {
    const key = `${p.sekolahId}|${p.batchKe}`
    const entry = pesertaCount.get(key) ?? { PESERTA: 0, PENDAMPING: 0 }
    entry[p.tipe] += 1
    pesertaCount.set(key, entry)
  }

  const tendaTotal = new Map<string, number>()
  for (const t of tendaSewaList) {
    tendaTotal.set(t.sekolahId, (tendaTotal.get(t.sekolahId) ?? 0) + t.jumlah * t.hargaSatuanSaatSewa)
  }

  const mismatches: MismatchItem[] = []
  for (const pb of pembayaranList) {
    const expected =
      pb.tipe === 'PESERTA'
        ? (() => {
            const c = pesertaCount.get(`${pb.sekolahId}|${pb.batchKe}`) ?? { PESERTA: 0, PENDAMPING: 0 }
            return c.PESERTA * BIAYA_PESERTA + c.PENDAMPING * BIAYA_PENDAMPING
          })()
        : tendaTotal.get(pb.sekolahId) ?? 0

    const selisih = pb.jumlahBiaya - expected
    if (selisih !== 0) {
      mismatches.push({
        pembayaranId: pb.id,
        sekolahId: pb.sekolahId,
        namaSekolah: pb.sekolah.namaLengkap,
        tipe: pb.tipe,
        batchKe: pb.batchKe,
        statusPembayaran: pb.statusPembayaran,
        jumlahBiaya: pb.jumlahBiaya,
        jumlahSeharusnya: expected,
        selisih,
      })
    }
  }

  return mismatches
}