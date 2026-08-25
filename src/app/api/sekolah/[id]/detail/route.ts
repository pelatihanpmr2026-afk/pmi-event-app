import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-guard'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params

    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      include: {
        peserta: { orderBy: [{ batchKe: 'asc' }, { createdAt: 'asc' }] },
        tendaSewa: { include: { tendaJenis: true } },
        pembayaran: { orderBy: [{ tipe: 'asc' }, { batchKe: 'asc' }] },
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
