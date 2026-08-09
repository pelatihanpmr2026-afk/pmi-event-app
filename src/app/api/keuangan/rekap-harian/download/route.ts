import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { getUraianLabel } from '@/lib/keuangan'
import { generateExcelRekapHarianKeuangan } from '@/lib/generate-excel-rekap-harian-keuangan'
import { generatePdfRekapHarianKeuangan } from '@/lib/generate-pdf-rekap-harian-keuangan'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tanggalStr = searchParams.get('tanggal')
    const format = searchParams.get('format')
    if (!tanggalStr || !format) return NextResponse.json({ success: false, message: 'Parameter tidak lengkap' }, { status: 400 })

    const start = new Date(`${tanggalStr}T00:00:00`)
    const end = new Date(`${tanggalStr}T23:59:59`)

    const transaksi = await prisma.transaksiKeuangan.findMany({
      where: { tanggal: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    })

    const rows = transaksi.map((t) => ({
      keterangan: t.keterangan,
      uraian: getUraianLabel(t.jenis, t.kategoriPemasukan, t.kategoriPengeluaran),
      debit: t.debit,
      kredit: t.kredit,
      utang: t.utang,
    }))

    const totals = {
      totalDebit: rows.reduce((s, r) => s + r.debit, 0),
      totalKredit: rows.reduce((s, r) => s + r.kredit, 0),
      totalUtang: rows.reduce((s, r) => s + r.utang, 0),
    }

    const tanggalLabel = new Date(tanggalStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    if (format === 'excel') {
      const buffer = await generateExcelRekapHarianKeuangan(tanggalLabel, rows, totals)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Rekap_Keuangan_${tanggalStr}.xlsx"`,
        },
      })
    }

    const buffer = await generatePdfRekapHarianKeuangan(tanggalLabel, rows, totals)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rekap_Keuangan_${tanggalStr}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/keuangan/rekap-harian/download]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}