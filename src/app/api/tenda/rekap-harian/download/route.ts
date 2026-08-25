import { NextRequest, NextResponse } from 'next/server'
import { generateExcelRekapTenda } from '@/lib/generate-excel-rekap-tenda'
import { generatePdfRekapTenda } from '@/lib/generate-pdf-rekap-tenda'
import { getRekapTendaData } from '@/lib/rekap-tenda'
import { resolveRekapTanggal } from '@/lib/rekap-tanggal'
import { requireRole } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const tanggalStr = searchParams.get('tanggal') ?? ''
    const format = searchParams.get('format')
    if (!tanggalStr || !format) return NextResponse.json({ success: false, message: 'Parameter tidak lengkap' }, { status: 400 })

    const { start, end, label, isAll } = resolveRekapTanggal(tanggalStr)

    const data = await getRekapTendaData(start, end)
    const fileBase = isAll ? 'Rekap_Sewa_Tenda_Semua_Tanggal' : `Rekap_Sewa_Tenda_${tanggalStr}`

    if (format === 'excel') {
      const buffer = await generateExcelRekapTenda(label, data.rows)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${fileBase}.xlsx"`,
        },
      })
    }

    const buffer = await generatePdfRekapTenda(label, data.rows)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileBase}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/tenda/rekap-harian/download]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}