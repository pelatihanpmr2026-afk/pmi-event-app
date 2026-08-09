import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

    const body = await req.json()
    const qrToken = body?.qrToken?.toString()?.trim()

    if (!qrToken) {
      return NextResponse.json(
        { success: false, message: 'QR Code tidak terbaca dengan benar' },
        { status: 400 }
      )
    }

    const pembayaran = await prisma.pembayaran.findUnique({
      where: { qrToken },
      include: {
        sekolah: {
          include: {
            peserta: { select: { tipe: true } },
          },
        },
      },
    })

    if (!pembayaran) {
      return NextResponse.json(
        { success: false, message: 'QR Code tidak dikenali — bukan kwitansi terdaftar' },
        { status: 404 }
      )
    }

    if (pembayaran.tipe !== 'PESERTA') {
      return NextResponse.json(
        { success: false, message: 'QR Code ini adalah kwitansi sewa tenda, bukan untuk daftar ulang' },
        { status: 400 }
      )
    }

    if (pembayaran.statusPembayaran !== 'LUNAS') {
      return NextResponse.json(
        { success: false, message: 'Pembayaran sekolah ini belum lunas, tidak bisa daftar ulang' },
        { status: 403 }
      )
    }

    const { sekolah } = pembayaran
    const jumlahPeserta = sekolah.peserta.filter((p) => p.tipe === 'PESERTA').length
    const jumlahPendamping = sekolah.peserta.filter((p) => p.tipe === 'PENDAMPING').length

    if (pembayaran.statusDaftarUlang) {
      return NextResponse.json(
        {
          success: false,
          message: `${sekolah.namaLengkap} sudah daftar ulang sebelumnya pada ${pembayaran.waktuDaftarUlang?.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' })}`,
          data: {
            namaLengkap: sekolah.namaLengkap,
            kodePendaftaran: sekolah.kodePendaftaran,
            kategori: sekolah.kategori,
            jumlahPeserta,
            jumlahPendamping,
          },
        },
        { status: 409 }
      )
    }

    await prisma.pembayaran.update({
      where: { id: pembayaran.id },
      data: { statusDaftarUlang: true, waktuDaftarUlang: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: 'Daftar ulang berhasil dicatat',
      data: {
        namaLengkap: sekolah.namaLengkap,
        kodePendaftaran: sekolah.kodePendaftaran,
        kategori: sekolah.kategori,
        jumlahPeserta,
        jumlahPendamping,
      },
    })
  } catch (error) {
    console.error('[POST /api/sekolah/daftar-ulang/scan]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}