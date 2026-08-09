import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { transaksiKeuanganSchema } from '@/lib/validations/transaksi-keuangan'
import type { Divisi } from '@prisma/client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

    const { id } = await params
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

    return NextResponse.json({ success: true, data: transaksi })
  } catch (error) {
    console.error('[PATCH /api/keuangan/transaksi/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

    const { id } = await params
    await prisma.transaksiKeuangan.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Transaksi berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/keuangan/transaksi/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}