import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { konfirmasiPembayaranSchema } from '@/lib/validations/pembayaran'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = konfirmasiPembayaranSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { aksi, catatanAdmin } = parsed.data

    const pembayaran = await prisma.pembayaran.findUnique({ where: { id } })

    if (!pembayaran) {
      return NextResponse.json({ success: false, message: 'Data pembayaran tidak ditemukan' }, { status: 404 })
    }

    if (pembayaran.statusPembayaran !== 'MENUNGGU_KONFIRMASI') {
      return NextResponse.json(
        { success: false, message: 'Pembayaran ini tidak sedang menunggu konfirmasi' },
        { status: 409 }
      )
    }

    const updated = await prisma.pembayaran.update({
      where: { id },
      data: {
        statusPembayaran: aksi,
        catatanAdmin: aksi === 'DITOLAK' ? catatanAdmin : null,
        dikonfirmasiPada: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: { statusPembayaran: updated.statusPembayaran },
    })
  } catch (error) {
    console.error('[POST /api/pembayaran/:id/konfirmasi]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}