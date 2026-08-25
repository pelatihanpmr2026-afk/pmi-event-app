import { prisma } from './prisma'
import { Prisma } from '@prisma/client'
import type { KategoriSekolah } from '@prisma/client'

// Format nomor peserta: 001.02.03.15.AR.WR.01.2026
// Nomor sekolah, kategori, dan urut peserta berubah; kode wilayah dan tahun tetap.
const FIXED_MIDDLE = '02.03.15.AR'
const FIXED_YEAR = '2026'

function kategoriCode(kategori: KategoriSekolah): 'MD' | 'WR' {
  return kategori === 'MADYA' ? 'MD' : 'WR'
}

function formatNoPeserta(
  nomorPendaftaran: number,
  kategori: KategoriSekolah,
  urutPeserta: number
): string {
  const nomorSekolah = String(nomorPendaftaran).padStart(3, '0')
  const nomorUrutPeserta = String(urutPeserta).padStart(2, '0')
  return `${nomorSekolah}.${FIXED_MIDDLE}.${kategoriCode(kategori)}.${nomorUrutPeserta}.${FIXED_YEAR}`
}

async function findNextUrutPeserta(
  tx: Prisma.TransactionClient,
  kategori: KategoriSekolah
): Promise<number> {
  // Nomor urut peserta dipisahkan per kategori PMR. Karena kategori juga
  // tercetak pada nomor peserta, Wira dan Madya masing-masing dapat mulai
  // dari 01 tanpa saling memengaruhi.
  const pesertaBernomor = await tx.peserta.findMany({
    where: { tipe: 'PESERTA', noPeserta: { not: null }, sekolah: { kategori } },
    select: { noPeserta: true },
  })

  let max = 0
  for (const peserta of pesertaBernomor) {
    if (!peserta.noPeserta) continue
    const bagian = peserta.noPeserta.split('.')
    // Pada format baru, urut peserta adalah segmen sebelum tahun.
    if (bagian.length !== 8 || bagian.at(-1) !== FIXED_YEAR || bagian[5] !== kategoriCode(kategori)) continue
    const urut = Number.parseInt(bagian.at(-2) ?? '', 10)
    if (Number.isInteger(urut) && urut > max) max = urut
  }

  return max + 1
}

/**
 * Generate + klaim No Peserta untuk seluruh peserta sekolah yang belum bernomor
 * dalam SATU transaksi serializable — nomor urut berurutan & bebas bentrok.
 *
 * Bila `tx` diberikan, klaim dijalankan dalam transaksi pemanggil (dipakai
 * konfirmasi LUNAS agar status pembayaran & penomoran atomik). Bila tidak,
 * dibuka transaksi sendiri dengan retry saat terjadi konflik antar-sekolah.
 */
async function claimNoPeserta(
  client: Prisma.TransactionClient,
  sekolahId: string
): Promise<void> {
  const sekolah = await client.sekolah.findUniqueOrThrow({
    where: { id: sekolahId },
    select: { nomorPendaftaran: true, kategori: true },
  })
  const pesertaTanpaNomor = await client.peserta.findMany({
    where: { sekolahId, tipe: 'PESERTA', noPeserta: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  let urut = await findNextUrutPeserta(client, sekolah.kategori)
  for (const peserta of pesertaTanpaNomor) {
    const noPeserta = formatNoPeserta(sekolah.nomorPendaftaran, sekolah.kategori, urut)
    await client.peserta.update({
      where: { id: peserta.id },
      data: { noPeserta },
    })
    urut++
  }
}

/**
 * Assign nomor untuk seluruh peserta sekolah yang belum memiliki nomor.
 * Dipanggil setelah pembayaran peserta dikonfirmasi lunas, termasuk batch susulan.
 */
export async function assignNoPesertaForSekolah(
  sekolahId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  if (tx) {
    await claimNoPeserta(tx, sekolahId)
    return
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await prisma.$transaction(
        (client) => claimNoPeserta(client, sekolahId),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
      return
    } catch (error) {
      // Konflik karena 2 sekolah dikonfirmasi bersamaan — coba lagi.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002')
      ) {
        continue
      }
      throw error
    }
  }

  throw new Error(`Gagal generate No Peserta untuk sekolah ${sekolahId} setelah ${10} percobaan`)
}
