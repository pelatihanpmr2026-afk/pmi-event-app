import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sesiSchema } from '@/lib/validations/absensi'

export async function GET() {
  try {
    const sesiList = await prisma.absensiSesi.findMany({
      orderBy: { tanggal: 'asc' },
      include: { _count: { select: { logs: true } } },
    })

    return NextResponse.json({ success: true, data: sesiList })
  } catch (error) {
    console.error('[GET /api/absensi/sesi]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = sesiSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { nama, tanggal, jamMulai, jamSelesai } = parsed.data

    const sesi = await prisma.absensiSesi.create({
      data: {
        nama,
        tanggal: new Date(tanggal),
        jamMulai,
        jamSelesai,
      },
    })

    return NextResponse.json({ success: true, data: sesi }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/absensi/sesi]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}