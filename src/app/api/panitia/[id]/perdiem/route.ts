import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { perdiemSchema } from '@/lib/validations/panitia'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'

/**
 * PATCH /api/panitia/:id/perdiem
 * Update nominal perdiem (insentif) panitia — diinput manual oleh admin.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const { id } = await params

    const panitia = await prisma.panitia.findUnique({ where: { id } })
    if (!panitia) {
      return NextResponse.json(
        { success: false, message: 'Data panitia tidak ditemukan' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const parsed = perdiemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Nominal perdiem tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await prisma.panitia.update({
      where: { id },
      data: { perdiem: parsed.data.perdiem },
      select: { id: true, perdiem: true },
    })

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'UPDATE_PERDIEM_PANITIA',
      {
        targetType: 'PANITIA',
        targetId: id,
        metadata: {
          targetName: panitia.nama,
          nomorRegistrasi: panitia.nomorRegistrasi,
          perdiemLama: panitia.perdiem,
          perdiemBaru: updated.perdiem,
        },
      }
    )

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[PATCH /api/panitia/:id/perdiem]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
