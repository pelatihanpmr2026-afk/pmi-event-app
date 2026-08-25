import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUraianLabel } from '@/lib/keuangan'
import { resolveRekapTanggal } from '@/lib/rekap-tanggal'
import { requireRole } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const tanggalStr = searchParams.get('tanggal') ?? ''
    if (!tanggalStr) return NextResponse.json({ success: false, message: 'Tanggal wajib diisi' }, { status: 400 })

    const { start, end } = resolveRekapTanggal(tanggalStr)

    const transaksi = await prisma.transaksiKeuangan.findMany({
      where: { tanggal: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    })

    const data = transaksi.map((t) => ({
      id: t.id,
      keterangan: t.keterangan,
      uraian: getUraianLabel(t.jenis, t.kategoriPemasukan, t.kategoriPengeluaran),
      jenis: t.jenis,
      debit: t.debit,
      kredit: t.kredit,
      utang: t.utang,
    }))

    return NextResponse.json({
      success: true,
      data: {
        transaksi: data,
        totalDebit: data.reduce((s, t) => s + t.debit, 0),
        totalKredit: data.reduce((s, t) => s + t.kredit, 0),
        totalUtang: data.reduce((s, t) => s + t.utang, 0),
      },
    })
  } catch (error) {
    console.error('[GET /api/keuangan/rekap-harian]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}