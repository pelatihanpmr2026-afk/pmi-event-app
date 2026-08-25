import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tendaJenisApiSchema } from '@/lib/validations/tenda-jenis'
import { TENDA_RESERVASI_JAM } from '@/lib/constants-sekolah'
import { getSession } from '@/lib/get-session'
import { requireRole } from '@/lib/api-guard'

export async function GET() {
  try {
    // hargaVendor adalah harga modal internal — hanya boleh terlihat oleh admin
    // (dashboard tenda), tidak oleh publik di alur sewa.
    const session = await getSession()
    const isAdmin = !!session

    const batasReservasi = new Date(Date.now() - TENDA_RESERVASI_JAM * 60 * 60 * 1000)
    const tendaList = await prisma.tendaJenis.findMany({ orderBy: { kapasitasMin: 'asc' } })

    const allSewa = await prisma.tendaSewa.findMany({
      select: {
        tendaJenisId: true,
        jumlah: true,
        sekolah: {
          select: {
            pembayaran: {
              where: { tipe: 'TENDA' },
              select: { statusPembayaran: true, updatedAt: true },
            },
          },
        },
      },
    })

    const terpakaiMap: Record<string, number> = {}
    for (const sewa of allSewa) {
      const pembayaranTenda = sewa.sekolah.pembayaran[0]
      if (
        !pembayaranTenda ||
        pembayaranTenda.statusPembayaran === 'DITOLAK' ||
        (pembayaranTenda.statusPembayaran === 'BELUM_BAYAR' && pembayaranTenda.updatedAt < batasReservasi)
      ) continue
      terpakaiMap[sewa.tendaJenisId] = (terpakaiMap[sewa.tendaJenisId] ?? 0) + sewa.jumlah
    }
    const reservasi = await prisma.reservasiTendaItem.findMany({ where: { reservasi: { expiresAt: { gt: new Date() } } }, select: { tendaJenisId: true, jumlah: true } })
    for (const item of reservasi) terpakaiMap[item.tendaJenisId] = (terpakaiMap[item.tendaJenisId] ?? 0) + item.jumlah

const data = tendaList.map((t) => ({
  id: t.id,
  nama: t.nama,
  namaVendor: isAdmin ? t.namaVendor : undefined,
  kapasitasMin: t.kapasitasMin,
  kapasitasMax: t.kapasitasMax,
  harga: t.harga,
  hargaVendor: isAdmin ? t.hargaVendor : undefined,
  stokTotal: t.stokTotal,
  stokTersisa: Math.max(t.stokTotal - (terpakaiMap[t.id] ?? 0), 0),
}))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/tenda]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const body = await req.json()
    const parsed = tendaJenisApiSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const tenda = await prisma.tendaJenis.create({ data: parsed.data })

    return NextResponse.json({ success: true, data: tenda }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tenda]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

