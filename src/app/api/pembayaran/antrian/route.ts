import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { canConfirmPembayaran } from '@/lib/admin-role'

/**
 * Antrian pembayaran yang menunggu konfirmasi (U7).
 * Tidak menyediakan pagination karena volume pembayaran event relatif kecil,
 * namun diurutkan FIFO (paling lama menunggu di atas).
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }
    if (!canConfirmPembayaran(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Role kamu tidak memiliki izin melihat antrian pembayaran' },
        { status: 403 }
      )
    }

    const list = await prisma.pembayaran.findMany({
      where: { statusPembayaran: 'MENUNGGU_KONFIRMASI' },
      include: {
        sekolah: {
          select: { namaLengkap: true, kodePendaftaran: true, noWhatsappPembina: true },
        },
      },
      orderBy: [{ updatedAt: 'asc' }],
    })

    return NextResponse.json({ success: true, data: list })
  } catch (error) {
    console.error('[GET /api/pembayaran/antrian]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}