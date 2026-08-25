import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { namaSekolahKey } from '@/lib/sekolah'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() ?? ''

    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    const queryKey = namaSekolahKey(q)
    const sekolahList = await prisma.sekolah.findMany({
select: {
        id: true,
        namaLengkap: true,
        kategori: true,
        estimasiPesertaPendamping: true,
        _count: { select: { peserta: true } },
        pembayaran: { where: { tipe: 'TENDA' }, select: { statusPembayaran: true } },
      },
      orderBy: { namaLengkap: 'asc' },
    })

    const data = sekolahList
      .filter((s) => namaSekolahKey(s.namaLengkap).includes(queryKey))
      .slice(0, 10)
.map((s) => ({
        id: s.id,
        namaLengkap: s.namaLengkap,
        kategori: s.kategori,
        // kodePendaftaran sengaja TIDAK diekspos ke publik: ia adalah bagian
        // dari kredensial verifikasi sekolah (bersama noWhatsappPembina).
        // Frontend hanya memakai id dari hasil pencarian ini.
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
