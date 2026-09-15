import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { perdiemBulkSchema } from '@/lib/validations/panitia'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'

/**
 * PATCH /api/panitia/perdiem-bulk
 * Set satu nominal perdiem untuk banyak panitia sekaligus.
 */
export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const body = await req.json()
    const parsed = perdiemBulkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { perdiem, ids } = parsed.data

    const result = await prisma.panitia.updateMany({
      where: { id: { in: ids } },
      data: { perdiem },
    })

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'UPDATE_PERDIEM_BULK_PANITIA',
      {
        targetType: 'PANITIA',
        metadata: {
          perdiemBaru: perdiem,
          jumlahDiminta: ids.length,
          jumlahDiperbarui: result.count,
        },
      }
    )

    return NextResponse.json({ success: true, data: { perdiem, jumlahDiperbarui: result.count } })
  } catch (error) {
    console.error('[PATCH /api/panitia/perdiem-bulk]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
