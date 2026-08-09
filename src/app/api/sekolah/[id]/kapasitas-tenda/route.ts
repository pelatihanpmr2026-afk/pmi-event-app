import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TENDA_TOLERANSI } from '@/lib/constants-sekolah'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      include: {
        peserta: { select: { id: true } },
        tendaSewa: { select: { tendaJenisId: true, jumlah: true } },
        pembayaran: { where: { tipe: 'TENDA' } },
      },
    })

    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }

    const jumlahAktual = sekolah.peserta.length
    const estimasi = sekolah.estimasiPesertaPendamping ?? 0
    const efektifJumlahOrang = Math.max(jumlahAktual, estimasi)
    const batasKapasitas = efektifJumlahOrang + TENDA_TOLERANSI

    const pembayaranTenda = sekolah.pembayaran[0] ?? null
    const terkunci = pembayaranTenda ? pembayaranTenda.statusPembayaran !== 'BELUM_BAYAR' : false

    return NextResponse.json({
      success: true,
      data: {
        namaLengkap: sekolah.namaLengkap,
        kodePendaftaran: sekolah.kodePendaftaran,
        jumlahAktual,
        estimasi,
        efektifJumlahOrang,
        batasKapasitas,
        terkunci,
        statusPembayaranTenda: pembayaranTenda?.statusPembayaran ?? null,
        pilihanSaatIni: sekolah.tendaSewa.map((t) => ({
          tendaJenisId: t.tendaJenisId,
          jumlah: t.jumlah,
        })),
      },
    })
  } catch (error) {
    console.error('[GET /api/sekolah/:id/kapasitas-tenda]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}