import { NextResponse } from 'next/server'
import { getSession } from '@/lib/get-session'
import { getKeuanganStatsData } from '@/lib/keuangan'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

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