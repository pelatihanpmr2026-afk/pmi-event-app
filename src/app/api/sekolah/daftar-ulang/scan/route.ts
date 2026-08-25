import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'

function ambilQrToken(nilaiQr: unknown): string | null {
  const nilai = nilaiQr?.toString()?.trim()
  if (!nilai) return null

  // Kwitansi baru menyimpan URL verifikasi lengkap di QR agar bisa dibuka
  // langsung dari kamera. QR lama hanya menyimpan token, jadi keduanya diterima.
  try {
    const url = new URL(nilai)
    const bagianPath = url.pathname.split('/').filter(Boolean)
    const indexVerifikasi = bagianPath.findIndex(
      (bagian, index) => bagian === 'kwitansi' && bagianPath[index + 1] === 'verifikasi'
    )

    return indexVerifikasi >= 0 ? bagianPath[indexVerifikasi + 2] ?? null : null
  } catch {
    return nilai
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const body = await req.json()
    const qrToken = ambilQrToken(body?.qrToken)

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
            peserta: { select: { tipe: true, namaLengkap: true, riwayatPenyakit: true } },
            tendaSewa: { include: { tendaJenis: { select: { nama: true } } } },
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
    const dataSekolah = {
      namaLengkap: sekolah.namaLengkap,
      kodePendaftaran: sekolah.kodePendaftaran,
      kategori: sekolah.kategori,
      jumlahPeserta,
      jumlahPendamping,
      tenda: sekolah.tendaSewa.map((tenda) => ({ nama: tenda.tendaJenis.nama, jumlah: tenda.jumlah })),
      pesertaDenganRiwayatPenyakit: sekolah.peserta
        .filter(
          (peserta) =>
            peserta.tipe === 'PESERTA' &&
            peserta.riwayatPenyakit &&
            peserta.riwayatPenyakit !== 'TIDAK_ADA'
        )
        .map((peserta) => ({ namaLengkap: peserta.namaLengkap, riwayatPenyakit: peserta.riwayatPenyakit! })),
    }

    if (pembayaran.statusDaftarUlang) {
      return NextResponse.json(
        {
          success: false,
          message: `${sekolah.namaLengkap} sudah daftar ulang sebelumnya pada ${pembayaran.waktuDaftarUlang?.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' })}`,
          data: dataSekolah,
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
      data: dataSekolah,
    })
  } catch (error) {
    console.error('[POST /api/sekolah/daftar-ulang/scan]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
