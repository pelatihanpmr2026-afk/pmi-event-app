import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { transaksiKeuanganSchema } from '@/lib/validations/transaksi-keuangan'
import { getTransaksiListData } from '@/lib/keuangan'
import type { Divisi } from '@prisma/client'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

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
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

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

    const transaksi = await prisma.transaksiKeuangan.create({
      data: {
        tanggal: new Date(data.tanggal),
        keterangan: data.keterangan,
        jenis: data.jenis,
        kategoriPemasukan: data.jenis === 'PEMASUKAN' ? data.kategoriPemasukan : null,
        kategoriPengeluaran: data.jenis === 'PENGELUARAN' ? data.kategoriPengeluaran : null,
        debit: data.jenis === 'PEMASUKAN' ? nominal : 0,
        kredit: data.jenis === 'PENGELUARAN' ? nominal : 0,
        utang: data.jenis === 'UTANG' ? nominal : 0,
        divisi:
          data.jenis === 'PENGELUARAN' && data.kategoriPengeluaran === 'OPERASIONAL_DIVISI'
            ? (data.divisi as Divisi)
            : null,
        pic:
          data.jenis === 'PENGELUARAN' && data.kategoriPengeluaran === 'OPERASIONAL_DIVISI'
            ? data.pic
            : null,
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