import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const panitia = await prisma.panitia.findUnique({
      where: { id },
    })

    if (!panitia) {
      return NextResponse.json(
        { success: false, message: 'Data panitia tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: panitia })
  } catch (error) {
    console.error('[GET /api/panitia/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.panitia.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Data panitia berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/panitia/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}