import { NextRequest, NextResponse } from 'next/server'
import { generateExcelRekapPendaftaran } from '@/lib/generate-excel-rekap-pendaftaran'
import { generatePdfRekapPendaftaran } from '@/lib/generate-pdf-rekap-pendaftaran'
import { getRekapPendaftaranData } from '@/lib/rekap-pendaftaran'
import { resolveRekapTanggal } from '@/lib/rekap-tanggal'
import { requireRole } from '@/lib/api-guard'

const FILE_BASE_PREFIX = 'Rekap_Pendaftaran'

function fileBase(isAll: boolean, tanggalStr: string) {
  return isAll ? `${FILE_BASE_PREFIX}_Semua_Tanggal` : `${FILE_BASE_PREFIX}_${tanggalStr}`
}

function parseAngka(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const num = typeof value === 'number' ? value : Number(value.replace(/[^\d]/g, ''))
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const tanggalStr = searchParams.get('tanggal') ?? ''
    const format = searchParams.get('format')
    if (!tanggalStr || !format) return NextResponse.json({ success: false, message: 'Parameter tidak lengkap' }, { status: 400 })

    const { start, end, label, isAll } = resolveRekapTanggal(tanggalStr)

    const { pendaftaran, tenda, ...totals } = await getRekapPendaftaranData(start, end)

    if (format === 'excel') {
      const buffer = await generateExcelRekapPendaftaran(label, pendaftaran, tenda, totals)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${fileBase(isAll, tanggalStr)}.xlsx"`,
        },
      })
    }

    const buffer = await generatePdfRekapPendaftaran(label, pendaftaran, tenda, totals, guard.session.nama, 0, 0)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileBase(isAll, tanggalStr)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/pendaftaran/rekap-harian/download]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}

/**
 * POST /api/pendaftaran/rekap-harian/download
 * Export PDF "Laporan Keuangan Harian" dengan rincian pembayaran tunai (cash)
 * dan transfer. Body:
 *   { tanggal: string, format?: 'pdf', totalCash?: number|string, totalTransfer?: number|string }
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ success: false, message: 'Body tidak valid' }, { status: 400 })

    const { tanggal: tanggalStr, format } = body
    if (typeof tanggalStr !== 'string' || !tanggalStr) {
      return NextResponse.json({ success: false, message: 'Parameter tanggal tidak lengkap' }, { status: 400 })
    }

    const { start, end, label, isAll } = resolveRekapTanggal(tanggalStr)
    const { pendaftaran, tenda, ...totals } = await getRekapPendaftaranData(start, end)

    if (format === 'excel') {
      const buffer = await generateExcelRekapPendaftaran(label, pendaftaran, tenda, totals)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${fileBase(isAll, tanggalStr)}.xlsx"`,
        },
      })
    }

    const totalCash = parseAngka(body.totalCash) ?? 0
    const totalTransfer = parseAngka(body.totalTransfer) ?? 0

    const buffer = await generatePdfRekapPendaftaran(label, pendaftaran, tenda, totals, guard.session.nama, totalCash, totalTransfer)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileBase(isAll, tanggalStr)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[POST /api/pendaftaran/rekap-harian/download]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}