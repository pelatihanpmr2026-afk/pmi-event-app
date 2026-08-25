import { NextRequest, NextResponse } from 'next/server'
import { editItemsApiSchema } from '@/lib/validations/pengajuan-anggaran'
import {
  updatePengajuanItems,
  NotFoundPengajuanError,
  PengajuanTerkunciError,
} from '@/lib/pengajuan-items'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const { id } = await params
    const body = await req.json()
    const parsed = editItemsApiSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    let updated: Awaited<ReturnType<typeof updatePengajuanItems>>
    try {
      updated = await updatePengajuanItems(id, parsed.data.items)
    } catch (error) {
      if (error instanceof NotFoundPengajuanError) {
        return NextResponse.json({ success: false, message: 'Pengajuan tidak ditemukan' }, { status: 404 })
      }
      if (error instanceof PengajuanTerkunciError) {
        return NextResponse.json(
          { success: false, message: 'Pengajuan yang sudah diproses tidak bisa diedit lagi' },
          { status: 409 }
        )
      }
      throw error
    }

    await logAdminAction(
  session.adminId,
  session.nama,
  session.role,
  'EDIT_ITEMS_PENGAJUAN',
  {
    targetType: 'PENGAJUAN',
    targetId: id,
    metadata: {
      totalJenisBarang: updated.totalJenisBarang,
      totalPengajuanBaru: updated.totalPengajuan,
      status: 'MENUNGGU'
    }
  }
)

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[PATCH /api/pengajuan-anggaran/:id/items]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}