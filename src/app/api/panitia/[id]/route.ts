import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const { id } = await params

    // FIX: Ambil panitia dulu sebelum dihapus
    const panitia = await prisma.panitia.findUnique({
      where: { id },
    })
    if (!panitia) {
      return NextResponse.json(
        { success: false, message: 'Data panitia tidak ditemukan' },
        { status: 404 }
      )
    }

    await prisma.panitia.delete({ where: { id } })

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'HAPUS_PANITIA',
      {
        targetType: 'PANITIA',
        targetId: id,
        metadata: {
          targetName: panitia.nama,
          nomorRegistrasi: panitia.nomorRegistrasi,
        },
      }
    )

    return NextResponse.json({ success: true, message: 'Data panitia berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/panitia/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}