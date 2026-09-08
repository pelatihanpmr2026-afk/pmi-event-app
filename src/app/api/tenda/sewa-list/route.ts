import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'

export async function GET() {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const sekolahList = await prisma.sekolah.findMany({
      where: {
        tendaSewa: { some: {} },
        pembayaran: { some: { tipe: 'TENDA', statusPembayaran: 'LUNAS' } },
      },
      include: {
        tendaSewa: { include: { tendaJenis: { select: { nama: true } } } },
        pembayaran: {
          where: { tipe: 'TENDA', statusPembayaran: 'LUNAS' },
          orderBy: { dikonfirmasiPada: 'desc' },
        },
      },
    })

    const data = sekolahList.map((s) => {
      const pembayaranTenda = s.pembayaran[0]
      return {
        id: s.id,
        namaSekolah: s.namaLengkap,
        kodePendaftaran: s.kodePendaftaran,
        tenda: s.tendaSewa.map((t) => ({ tendaJenisId: t.tendaJenisId, nama: t.tendaJenis.nama, jumlah: t.jumlah })),
        totalUnit: s.tendaSewa.reduce((sum, t) => sum + t.jumlah, 0),
        totalBiaya: pembayaranTenda?.jumlahBiaya ?? 0,
        tanggalSewa: pembayaranTenda?.dikonfirmasiPada?.toISOString() ?? null,
      }
    }).sort((a, b) => {
      if (!a.tanggalSewa && !b.tanggalSewa) return a.namaSekolah.localeCompare(b.namaSekolah)
      if (!a.tanggalSewa) return 1
      if (!b.tanggalSewa) return -1
      const dateDifference = new Date(a.tanggalSewa).getTime() - new Date(b.tanggalSewa).getTime()
      return dateDifference || a.namaSekolah.localeCompare(b.namaSekolah)
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/tenda/sewa-list]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}