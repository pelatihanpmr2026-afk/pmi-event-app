import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-guard'
import { cekRekonsiliasiPembayaran } from '@/lib/rekonsiliasi'

export async function GET() {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const mismatches = await cekRekonsiliasiPembayaran()
    return NextResponse.json({ success: true, data: mismatches })
  } catch (error) {
    console.error('[GET /api/keuangan/rekonsiliasi]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}