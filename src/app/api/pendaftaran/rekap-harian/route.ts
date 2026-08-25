import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-guard'
import { getRekapPendaftaranData } from '@/lib/rekap-pendaftaran'
import { resolveRekapTanggal } from '@/lib/rekap-tanggal'

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const tanggalStr = searchParams.get('tanggal') ?? ''
    if (!tanggalStr) return NextResponse.json({ success: false, message: 'Tanggal wajib diisi' }, { status: 400 })

    const { start, end } = resolveRekapTanggal(tanggalStr)

    const data = await getRekapPendaftaranData(start, end)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/pendaftaran/rekap-harian]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}