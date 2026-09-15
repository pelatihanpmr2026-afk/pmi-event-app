import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DIVISI_OPTIONS, DIVISI_CAPACITY } from '@/lib/constants'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

export async function GET() {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const kuotaRows = await prisma.divisiKuota.findMany()
    const countRows = await Promise.all(
      DIVISI_OPTIONS.map((d) =>
        prisma.panitia.count({ where: { divisi: d.value as never } })
      )
    )

    const kuotaMap: Record<string, number> = { ...DIVISI_CAPACITY }
    for (const row of kuotaRows) kuotaMap[row.divisi] = row.maksimal

    const data = DIVISI_OPTIONS.map((d, i) => ({
      divisi: d.value,
      label: d.label,
      maksimal: kuotaMap[d.value],
      terisi: countRows[i] ?? 0,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/panitia/kuota]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const body = await req.json()
    const divisi = body?.divisi
    const maksimal = Number(body?.maksimal)

    const divisiOption = DIVISI_OPTIONS.find((d) => d.value === divisi)
    if (!divisiOption) {
      return NextResponse.json({ success: false, message: 'Divisi tidak valid' }, { status: 400 })
    }
    if (!Number.isInteger(maksimal) || maksimal < 1 || maksimal > 500) {
      return NextResponse.json(
        { success: false, message: 'Kuota maksimal harus angka bulat antara 1 sampai 500' },
        { status: 400 }
      )
    }

    const terisi = await prisma.panitia.count({ where: { divisi: divisi as never } })
    if (maksimal < terisi) {
      return NextResponse.json(
        {
          success: false,
          message: `Kuota tidak bisa lebih kecil dari jumlah terisi saat ini (${terisi} orang).`,
        },
        { status: 409 }
      )
    }

    const result = await prisma.divisiKuota.upsert({
      where: { divisi: divisi as never },
      update: { maksimal },
      create: { divisi: divisi as never, maksimal },
    })

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'ATUR_KUOTA_DIVISI',
      {
        targetType: 'DIVISI',
        targetId: divisi,
        metadata: { divisi: divisi as never, maksimal },
      }
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[PATCH /api/panitia/kuota]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}