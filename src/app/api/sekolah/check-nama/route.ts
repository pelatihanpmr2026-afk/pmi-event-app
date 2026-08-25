import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { namaSekolahKey, normalizeNamaSekolah } from '@/lib/sekolah'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const namaSekolah = searchParams.get('namaSekolah')?.trim() ?? ''

    if (namaSekolah.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Parameter tidak lengkap' },
        { status: 400 }
      )
    }

    const namaLengkap = normalizeNamaSekolah(namaSekolah)

    const sekolahList = await prisma.sekolah.findMany({
      select: {
        id: true,
        namaLengkap: true,
        namaPembina: true,
        noWhatsappPembina: true,
        _count: { select: { peserta: true } },
      },
    })
    const existing = sekolahList.find((sekolah) => namaSekolahKey(sekolah.namaLengkap) === namaSekolahKey(namaLengkap))

    if (!existing) {
      return NextResponse.json({
        success: true,
        data: { namaLengkap, status: 'tersedia' },
      })
    }

    if (existing._count.peserta > 0) {
      return NextResponse.json({
        success: true,
        data: { namaLengkap, status: 'terpakai_lengkap' },
      })
    }

    // Sekolah sudah ada (kemungkinan dari alur sewa tenda duluan) tapi belum ada peserta
    return NextResponse.json({
      success: true,
      data: {
        namaLengkap,
        status: 'terpakai_tenda_saja',
        sekolahId: existing.id,
        namaPembina: existing.namaPembina,
        noWhatsappPembina: existing.noWhatsappPembina,
      },
    })
  } catch (error) {
    console.error('[GET /api/sekolah/check-nama]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
