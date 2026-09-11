import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-guard'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const draft = await prisma.draft.findUnique({
      where: { id },
    })

    if (!draft) {
      return NextResponse.json({ success: false, message: 'Draft tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: draft.id,
        namaSekolah: draft.namaSekolah,
        currentStep: draft.currentStep,
        dataSekolah: draft.dataSekolah,
        dataPeserta: draft.dataPeserta,
        dataPendamping: draft.dataPendamping,
        updatedAt: draft.updatedAt.toISOString(),
        createdAt: draft.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[GET /api/draft/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal memuat draft' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const draft = await prisma.draft.findUnique({ where: { id } })
    if (!draft) {
      return NextResponse.json({ success: false, message: 'Draft tidak ditemukan' }, { status: 404 })
    }

    await prisma.draft.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/draft/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal menghapus draft' }, { status: 500 })
  }
}
