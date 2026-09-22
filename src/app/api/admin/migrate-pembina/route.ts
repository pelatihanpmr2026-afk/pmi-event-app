import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-guard'
import { migratePembinaData } from '@/lib/migrate-pembina'

export async function POST() {
  try {
    const guard = await requireRole('SUPERADMIN')
    if (!guard.ok) return guard.response

    const result = await migratePembinaData()

    return NextResponse.json({
      success: true,
      message: `Migrasi selesai: ${result.created} pembina ditambahkan, ${result.skipped} dilewati (sudah ada)`,
      data: result,
    })
  } catch (error) {
    console.error('[POST /api/admin/migrate-pembina]', error)
    return NextResponse.json({ success: false, message: 'Gagal migrasi data pembina' }, { status: 500 })
  }
}
