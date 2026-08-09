import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { tendaJenisApiSchema } from '@/lib/validations/tenda-jenis'

export async function GET() {
  try {
    const tendaList = await prisma.tendaJenis.findMany({ orderBy: { kapasitasMin: 'asc' } })

    const allSewa = await prisma.tendaSewa.findMany({
      select: {
        tendaJenisId: true,
        jumlah: true,
        sekolah: {
          select: {
            pembayaran: {
              where: { tipe: 'TENDA' },
              select: { statusPembayaran: true },
            },
          },
        },
      },
    })

    const terpakaiMap: Record<string, number> = {}
    for (const sewa of allSewa) {
      const statusTenda = sewa.sekolah.pembayaran[0]?.statusPembayaran
      if (statusTenda === 'DITOLAK') continue // pembayaran ditolak = bebaskan lagi stoknya
      terpakaiMap[sewa.tendaJenisId] = (terpakaiMap[sewa.tendaJenisId] ?? 0) + sewa.jumlah
    }

const data = tendaList.map((t) => ({
  id: t.id,
  nama: t.nama,
  kapasitasMin: t.kapasitasMin,
  kapasitasMax: t.kapasitasMax,
  harga: t.harga,
  hargaVendor: t.hargaVendor,
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
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

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

