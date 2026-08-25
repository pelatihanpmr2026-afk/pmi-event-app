import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transaksiKeuanganSchema } from '@/lib/validations/transaksi-keuangan'
import type { Divisi } from '@prisma/client'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response
    const session = guard.session

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

    const existing = await prisma.transaksiKeuangan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Transaksi tidak ditemukan' }, { status: 404 })
    }
    if (existing.pengajuanId) {
      return NextResponse.json(
        { success: false, message: 'Transaksi dari pengajuan anggaran bersifat otomatis dan tidak bisa diedit' },
        { status: 409 }
      )
    }

    // FIX: Hapus const utang = data.utang ... 
    // Kita langsung tentukan nilai utang berdasarkan jenis transaksi di bawah.

    const transaksi = await prisma.transaksiKeuangan.update({
      where: { id },
      data: {
        tanggal: new Date(data.tanggal),
        keterangan: data.keterangan,
        jenis: data.jenis,
        kategoriPemasukan: data.jenis === 'PEMASUKAN' ? data.kategoriPemasukan : null,
        kategoriPengeluaran: data.jenis === 'PENGELUARAN' ? data.kategoriPengeluaran : null,
        debit: data.jenis === 'PEMASUKAN' ? nominal : 0,
        kredit: data.jenis === 'PENGELUARAN' ? nominal : 0,
        utang: data.jenis === 'UTANG' ? nominal : 0, // <-- Perbaikan di sini
        divisi: data.divisi as Divisi,
        pic: data.pic,
      },
    })

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'EDIT_TRANSAKSI',
      {
        targetType: 'TRANSAKSI',
        targetId: id,
        metadata: {
          targetName: transaksi.keterangan,
          jenis: data.jenis,
          nominal: nominal,
        },
      }
    )

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
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const { id } = await params

    // Ambil transaksi dulu sebelum dihapus
    const transaksi = await prisma.transaksiKeuangan.findUnique({
      where: { id },
    })
    if (!transaksi) {
      return NextResponse.json({ success: false, message: 'Transaksi tidak ditemukan' }, { status: 404 })
    }
    if (transaksi.pengajuanId) {
      return NextResponse.json(
        { success: false, message: 'Transaksi dari pengajuan anggaran bersifat otomatis dan tidak bisa dihapus' },
        { status: 409 }
      )
    }

    await prisma.transaksiKeuangan.delete({ where: { id } })

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'HAPUS_TRANSAKSI',
      {
        targetType: 'TRANSAKSI',
        targetId: id,
        metadata: { targetName: transaksi.keterangan },
      }
    )

    return NextResponse.json({ success: true, message: 'Transaksi berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/keuangan/transaksi/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
