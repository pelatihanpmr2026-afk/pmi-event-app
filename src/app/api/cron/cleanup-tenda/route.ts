import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { batasReservasiTenda } from '@/lib/tenda-stock'
import { logAdminAction } from '@/lib/admin-log'

/**
 * Menghapus pilihan tenda yang belum dibayar setelah masa reservasinya habis.
 * Endpoint ini harus dipanggil oleh scheduler tepercaya dengan header:
 * Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = req.headers.get('authorization')

  if (!cronSecret) {
    console.error('[POST /api/cron/cleanup-tenda] CRON_SECRET belum dikonfigurasi')
    return NextResponse.json({ success: false, message: 'Cron belum dikonfigurasi' }, { status: 503 })
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
  }

  try {
    const batasReservasi = batasReservasiTenda()

    // Ambil reservasi sementara yang kedaluwarsa dulu agar bisa dicatat sebagai
    // pengingat (reminder/audit trail) sebelum dihapus (U5).
    const reservasiKedaluwarsaRows = await prisma.reservasiTenda.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: { id: true, namaSekolah: true, noWhatsappPembina: true, expiresAt: true },
    })
    const reservasiSementaraDihapus = await prisma.reservasiTenda.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    for (const reservasi of reservasiKedaluwarsaRows) {
      await logAdminAction(null, 'CRON', null, 'TENDA_RESERVASI_KADALUARSA', {
        targetType: 'RESERVASI_TENDA',
        targetId: reservasi.id,
        metadata: {
          namaSekolah: reservasi.namaSekolah,
          noWhatsappPembina: reservasi.noWhatsappPembina,
          expiresAt: reservasi.expiresAt.toISOString(),
        },
      })
    }

    const reservasiKedaluwarsa = await prisma.pembayaran.findMany({
      where: {
        tipe: 'TENDA',
        statusPembayaran: 'BELUM_BAYAR',
        updatedAt: { lt: batasReservasi },
      },
      select: { id: true, sekolahId: true, sekolah: { select: { namaLengkap: true, noWhatsappPembina: true } } },
    })

    let jumlahDihapus = 0
    for (const pembayaran of reservasiKedaluwarsa) {
      const dihapus = await prisma.$transaction(async (tx) => {
        // Kondisi diulang agar reservasi yang baru diperbarui tidak ikut terhapus.
        const pembayaranDihapus = await tx.pembayaran.deleteMany({
          where: {
            id: pembayaran.id,
            sekolahId: pembayaran.sekolahId,
            tipe: 'TENDA',
            statusPembayaran: 'BELUM_BAYAR',
            updatedAt: { lt: batasReservasi },
          },
        })

        if (pembayaranDihapus.count === 0) return false

        await tx.tendaSewa.deleteMany({ where: { sekolahId: pembayaran.sekolahId } })
        return true
      })

      if (dihapus) {
        jumlahDihapus++
        await logAdminAction(null, 'CRON', null, 'TENDA_BELUM_BAYAR_DIBERSIHKAN', {
          targetType: 'SEKOLAH',
          targetId: pembayaran.sekolahId,
          metadata: {
            namaSekolah: pembayaran.sekolah.namaLengkap,
            noWhatsappPembina: pembayaran.sekolah.noWhatsappPembina,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        jumlahDihapus,
        reservasiSementaraDihapus: reservasiSementaraDihapus.count,
        batasReservasi,
      },
    })
  } catch (error) {
    console.error('[POST /api/cron/cleanup-tenda]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
