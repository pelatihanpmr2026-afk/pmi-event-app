import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeNamaSekolah } from '@/lib/sekolah'
import type { Jenjang, StatusSekolah } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jenjang = searchParams.get('jenjang') as Jenjang | null
    const statusSekolah = searchParams.get('statusSekolah') as StatusSekolah | null
    const namaInput = searchParams.get('namaInput')?.trim() ?? ''

    if (!jenjang || !statusSekolah || namaInput.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Parameter tidak lengkap' },
        { status: 400 }
      )
    }

    const namaLengkap = normalizeNamaSekolah(jenjang, statusSekolah, namaInput)

    const existing = await prisma.sekolah.findUnique({
      where: { namaLengkap },
      select: {
        id: true,
        namaPembina: true,
        noWhatsappPembina: true,
        _count: { select: { peserta: true } },
      },
    })

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