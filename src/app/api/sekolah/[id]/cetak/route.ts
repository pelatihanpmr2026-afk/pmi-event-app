import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'

/**
 * POST /api/sekolah/:id/cetak
 * Menandai / membatalkan status "sudah dicetak" data peserta sebuah sekolah.
 * Role KTA (dan SUPERADMIN lewat requireRole) yang memakai ini.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KTA')
    if (!guard.ok) return guard.response

    const { id } = await params
    const body = await req.json()
    const sudahCetak = body?.sudahCetak === true

    const sekolah = await prisma.sekolah.findUnique({ where: { id }, select: { id: true } })
    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }

    await prisma.sekolah.update({
      where: { id },
      data: { sudahCetak },
    })

    return NextResponse.json({ success: true, data: { sudahCetak } })
  } catch (error) {
    console.error('[POST /api/sekolah/:id/cetak]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}