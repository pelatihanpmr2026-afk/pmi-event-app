import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { perdiemBulkSchema } from '@/lib/validations/panitia'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'

/**
 * PATCH /api/panitia/perdiem-bulk
 * Hitung perdiem massal: nominal per hari/sesi dikali jumlah kehadiran
 * (absensiLogs) tiap panitia. Panitia tanpa kehadiran mendapat 0.
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
    const { nominalPerHari, ids } = parsed.data

    const panitiaList = await prisma.panitia.findMany({
      where: { id: { in: ids } },
      select: { id: true, absensiLogs: { select: { sesiId: true } } },
    })

    const items = panitiaList.map((p) => ({
      id: p.id,
      hadir: p.absensiLogs.length,
      perdiem: nominalPerHari * p.absensiLogs.length,
    }))

    await prisma.$transaction(
      items.map((item) =>
        prisma.panitia.update({ where: { id: item.id }, data: { perdiem: item.perdiem } })
      )
    )

    const totalPerdiem = items.reduce((sum, item) => sum + item.perdiem, 0)

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'UPDATE_PERDIEM_BULK_PANITIA',
      {
        targetType: 'PANITIA',
        metadata: {
          nominalPerHari,
          jumlahDiminta: ids.length,
          jumlahDiperbarui: items.length,
          totalPerdiem,
        },
      }
    )

    return NextResponse.json({
      success: true,
      data: { nominalPerHari, jumlahDiperbarui: items.length, totalPerdiem, items },
    })
  } catch (error) {
    console.error('[PATCH /api/panitia/perdiem-bulk]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
