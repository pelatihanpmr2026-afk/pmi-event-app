import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

    const { id } = await params

    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      include: {
        peserta: { orderBy: { createdAt: 'asc' } },
        tendaSewa: { include: { tendaJenis: true } },
        pembayaran: true,
      },
    })

    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: sekolah })
  } catch (error) {
    console.error('[GET /api/sekolah/:id/detail]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}