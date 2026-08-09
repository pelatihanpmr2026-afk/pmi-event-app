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

    const pengajuan = await prisma.pengajuanAnggaran.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!pengajuan) {
      return NextResponse.json({ success: false, message: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: pengajuan })
  } catch (error) {
    console.error('[GET /api/pengajuan-anggaran/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}