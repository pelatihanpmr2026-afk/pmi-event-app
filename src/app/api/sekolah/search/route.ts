import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() ?? ''

    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    const sekolahList = await prisma.sekolah.findMany({
      where: { namaLengkap: { contains: q } },
      select: {
        id: true,
        namaLengkap: true,
        kategori: true,
        kodePendaftaran: true,
        estimasiPesertaPendamping: true,
        _count: { select: { peserta: true } },
        pembayaran: { where: { tipe: 'TENDA' }, select: { statusPembayaran: true } },
      },
      take: 10,
      orderBy: { namaLengkap: 'asc' },
    })

    const data = sekolahList.map((s) => ({
      id: s.id,
      namaLengkap: s.namaLengkap,
      kategori: s.kategori,
      kodePendaftaran: s.kodePendaftaran,
      jumlahPeserta: s._count.peserta,
      estimasiPesertaPendamping: s.estimasiPesertaPendamping,
      tendaTerkunci: s.pembayaran[0] ? s.pembayaran[0].statusPembayaran !== 'BELUM_BAYAR' : false,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/sekolah/search]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}