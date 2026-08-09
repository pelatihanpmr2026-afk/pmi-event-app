import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tendaSelectionSchema } from '@/lib/validations/tenda'
import { TENDA_TOLERANSI } from '@/lib/constants-sekolah'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = tendaSelectionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Data tidak valid' }, { status: 400 })
    }

    const { pilihan } = parsed.data

    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      include: {
        peserta: { select: { id: true } },
        pembayaran: { where: { tipe: 'TENDA' } },
      },
    })

    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }

    const pembayaranTenda = sekolah.pembayaran[0] ?? null
    if (pembayaranTenda && pembayaranTenda.statusPembayaran !== 'BELUM_BAYAR') {
      return NextResponse.json(
        {
          success: false,
          message: 'Pilihan tenda untuk sekolah ini sudah masuk proses pembayaran dan tidak bisa diubah lagi',
        },
        { status: 409 }
      )
    }

    const jumlahAktual = sekolah.peserta.length
    const estimasi = sekolah.estimasiPesertaPendamping ?? 0
    const efektifJumlahOrang = Math.max(jumlahAktual, estimasi)
    const batasKapasitas = efektifJumlahOrang + TENDA_TOLERANSI

    if (pilihan.length === 0) {
      // Kosongkan seluruh pilihan tenda sekolah ini
      await prisma.$transaction([
        prisma.tendaSewa.deleteMany({ where: { sekolahId: id } }),
        prisma.pembayaran.deleteMany({ where: { sekolahId: id, tipe: 'TENDA' } }),
      ])

      return NextResponse.json({ success: true, data: { jumlahBiaya: 0 } })
    }

    const tendaIds = pilihan.map((p) => p.tendaJenisId)
    const tendaJenisList = await prisma.tendaJenis.findMany({ where: { id: { in: tendaIds } } })

    let totalKapasitas = 0
    let jumlahBiaya = 0

    for (const p of pilihan) {
      const jenis = tendaJenisList.find((t) => t.id === p.tendaJenisId)
      if (!jenis) {
        return NextResponse.json({ success: false, message: 'Jenis tenda tidak ditemukan' }, { status: 400 })
      }
      totalKapasitas += jenis.kapasitasMax * p.jumlah
      jumlahBiaya += jenis.harga * p.jumlah
    }

    if (totalKapasitas > batasKapasitas) {
      return NextResponse.json(
        {
          success: false,
          message: `Total kapasitas tenda (${totalKapasitas} orang) melebihi batas maksimal (${batasKapasitas} orang)`,
        },
        { status: 400 }
      )
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        for (const p of pilihan) {
          const jenis = tendaJenisList.find((t) => t.id === p.tendaJenisId)!

          const sewaLainAgg = await tx.tendaSewa.findMany({
            where: { tendaJenisId: p.tendaJenisId, sekolahId: { not: id } },
            select: {
              jumlah: true,
              sekolah: {
                select: { pembayaran: { where: { tipe: 'TENDA' }, select: { statusPembayaran: true } } },
              },
            },
          })

          const terpakaiLain = sewaLainAgg.reduce((sum, s) => {
            const status = s.sekolah.pembayaran[0]?.statusPembayaran
            return status === 'DITOLAK' ? sum : sum + s.jumlah
          }, 0)

          const stokTersisa = jenis.stokTotal - terpakaiLain

          if (p.jumlah > stokTersisa) {
            throw new Error(`STOK_HABIS:${jenis.nama}:${stokTersisa}`)
          }
        }

        await tx.tendaSewa.deleteMany({ where: { sekolahId: id } })
        await tx.tendaSewa.createMany({
          data: pilihan.map((p) => {
            const jenis = tendaJenisList.find((t) => t.id === p.tendaJenisId)!
            return {
              sekolahId: id,
              tendaJenisId: p.tendaJenisId,
              jumlah: p.jumlah,
              hargaSatuanSaatSewa: jenis.harga,
            }
          }),
        })

        await tx.pembayaran.upsert({
          where: { sekolahId_tipe: { sekolahId: id, tipe: 'TENDA' } },
          create: { sekolahId: id, tipe: 'TENDA', jumlahBiaya, statusPembayaran: 'BELUM_BAYAR' },
          update: { jumlahBiaya },
        })

        return { jumlahBiaya }
      })

      return NextResponse.json({ success: true, data: result })
    } catch (txError) {
      if (txError instanceof Error && txError.message.startsWith('STOK_HABIS:')) {
        const [, nama, sisa] = txError.message.split(':')
        return NextResponse.json(
          { success: false, message: `Stok "${nama}" tersisa ${sisa} unit, tidak cukup.` },
          { status: 409 }
        )
      }
      throw txError
    }
  } catch (error) {
    console.error('[POST /api/sekolah/:id/tenda]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}