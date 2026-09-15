import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transaksiKeuanganSchema } from '@/lib/validations/transaksi-keuangan'
import type { Divisi } from '@prisma/client'
import { requireRole } from '@/lib/api-guard'
import { getTransaksiListData } from '@/lib/keuangan'

export async function GET() {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const data = await getTransaksiListData()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/keuangan/transaksi]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const body = await req.json()
    const parsed = transaksiKeuanganSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const nominal = Number(data.nominal)

    if (data.pengajuanId) {
      const pengajuan = await prisma.pengajuanAnggaran.findFirst({ where: { id: data.pengajuanId } })
      if (!pengajuan || pengajuan.status !== 'DISETUJUI') {
        return NextResponse.json(
          { success: false, message: 'Pengajuan terkait tidak ditemukan atau belum disetujui' },
          { status: 400 }
        )
      }
      const sudahDipakai = await prisma.transaksiKeuangan.aggregate({
        where: { pengajuanId: data.pengajuanId },
        _sum: { kredit: true },
      })
      const sisa = pengajuan.totalPengajuan - (sudahDipakai._sum.kredit ?? 0)
      if (nominal > sisa) {
        return NextResponse.json(
          { success: false, message: `Nominal melebihi sisa anggaran pengajuan (Rp${sisa.toLocaleString('id-ID')})` },
          { status: 400 }
        )
      }
    }

    const transaksi = await prisma.transaksiKeuangan.create({
      data: {
        tanggal: new Date(data.tanggal),
        keterangan: data.keterangan,
        jenis: data.jenis,
        kategoriPemasukan: data.jenis === 'PEMASUKAN' ? data.kategoriPemasukan : null,
        kategoriPengeluaran: data.jenis === 'PENGELUARAN' ? data.kategoriPengeluaran : null,
        vendorName: data.vendorName ?? null,
        pengajuanId: data.pengajuanId ?? null,
        debit: data.jenis === 'PEMASUKAN' ? nominal : 0,
        kredit: data.jenis === 'PENGELUARAN' ? nominal : 0,
        utang: data.jenis === 'UTANG' ? nominal : 0,
        divisi: data.divisi as Divisi,
        pic: data.pic,
      },
    })

    return NextResponse.json({ success: true, data: transaksi }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/keuangan/transaksi]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
