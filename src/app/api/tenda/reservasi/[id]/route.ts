import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/tenda/reservasi/:id
 * Detail reservasi sementara (rincian tenda, total biaya, batas waktu) untuk
 * ditampilkan di halaman pembayaran tenda alur sekolah baru.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRateLimit(req, { key: 'tenda-reservasi-get', max: 60, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const { id } = await params

    const reservasi = await prisma.reservasiTenda.findUnique({
      where: { id },
      include: {
        items: { include: { tendaJenis: { select: { nama: true } } } },
      },
    })

    if (!reservasi) {
      return NextResponse.json(
        { success: false, message: 'Reservasi tidak ditemukan atau sudah kedaluwarsa' },
        { status: 404 }
      )
    }
    if (reservasi.expiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, message: 'Reservasi sudah kedaluwarsa. Silakan pilih tenda kembali.' },
        { status: 409 }
      )
    }

    const tendaSewaList = reservasi.items.map((item) => ({
      nama: item.tendaJenis.nama,
      jumlah: item.jumlah,
      hargaSatuan: item.hargaSatuan,
      subtotal: item.jumlah * item.hargaSatuan,
    }))
    const jumlahBiaya = tendaSewaList.reduce((total, item) => total + item.subtotal, 0)

    return NextResponse.json({
      success: true,
      data: {
        namaSekolah: reservasi.namaSekolah,
        kategori: reservasi.kategori,
        estimasiPesertaPendamping: reservasi.estimasiPesertaPendamping,
        expiresAt: reservasi.expiresAt.toISOString(),
        tendaSewaList,
        jumlahBiaya,
      },
    })
  } catch (error) {
    console.error('[GET /api/tenda/reservasi/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}