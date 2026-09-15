import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { perdiemBulkSchema } from '@/lib/validations/panitia'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'

/**
 * PATCH /api/panitia/perdiem-bulk
 * Hitung perdiem massal dua mode:
 * - per_hari: nominal per hari/sesi × jumlah kehadiran tiap panitia (0 hadir = Rp0).
 * - borongan: total dana dibagi rata ke panitia yang hadir (>=1 absensi);
 *   sisa pembulatan dibagi +Rp1 dari depan (urut nomor registrasi) agar total pas.
 *   Panitia cakupan yang 0 hadir diset Rp0.
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
    const { ids } = parsed.data

    const panitiaList = await prisma.panitia.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        nomorRegistrasi: true,
        absensiLogs: { select: { sesiId: true } },
      },
    })

    let items: { id: string; hadir: number; perdiem: number }[]
    let logMetadata: Record<string, number | string>

    if (parsed.data.mode === 'borongan') {
      const { totalDana, unit } = parsed.data
      const eligible = panitiaList
        .filter((p) => p.absensiLogs.length > 0)
        .sort((a, b) => a.nomorRegistrasi.localeCompare(b.nomorRegistrasi))
      const eligibleIds = new Set(eligible.map((p) => p.id))
      const dasar = eligible.length > 0 ? Math.floor(totalDana / eligible.length) : 0
      const sisa = eligible.length > 0 ? totalDana - dasar * eligible.length : 0
      const bonusIds = new Set(eligible.slice(0, sisa).map((p) => p.id))
      items = panitiaList.map((p) => ({
        id: p.id,
        hadir: p.absensiLogs.length,
        perdiem: !eligibleIds.has(p.id) ? 0 : dasar + (bonusIds.has(p.id) ? 1 : 0),
      }))
      logMetadata = {
        mode: 'borongan',
        totalDana,
        unit: unit ?? '-',
        jumlahEligible: eligible.length,
        jumlahDiperbarui: items.length,
        perdiemDasar: dasar,
      }
    } else {
      const { nominalPerHari } = parsed.data
      items = panitiaList.map((p) => ({
        id: p.id,
        hadir: p.absensiLogs.length,
        perdiem: nominalPerHari * p.absensiLogs.length,
      }))
      logMetadata = {
        mode: 'per_hari',
        nominalPerHari,
        jumlahDiminta: ids.length,
        jumlahDiperbarui: items.length,
        totalPerdiem: items.reduce((sum, item) => sum + item.perdiem, 0),
      }
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.panitia.update({ where: { id: item.id }, data: { perdiem: item.perdiem } })
      )
    )

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'UPDATE_PERDIEM_BULK_PANITIA',
      { targetType: 'PANITIA', metadata: logMetadata }
    )

    return NextResponse.json({
      success: true,
      data: {
        jumlahDiperbarui: items.length,
        totalPerdiem: items.reduce((sum, item) => sum + item.perdiem, 0),
        items,
      },
    })
  } catch (error) {
    console.error('[PATCH /api/panitia/perdiem-bulk]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
