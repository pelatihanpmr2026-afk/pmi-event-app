import { NextResponse } from 'next/server'
import { getKeuanganStatsData } from '@/lib/keuangan'
import { requireRole } from '@/lib/api-guard'

export async function GET() {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const data = await getKeuanganStatsData()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/keuangan/stats]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}