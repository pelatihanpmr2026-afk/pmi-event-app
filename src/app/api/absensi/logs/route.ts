import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const logs = await prisma.absensiLog.findMany({
      orderBy: { scannedAt: 'desc' },
      take: 50,
      include: {
        panitia: {
          select: { nama: true, divisi: true, fotoUrl: true, nomorRegistrasi: true },
        },
        sesi: {
          select: { nama: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('[GET /api/absensi/logs]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}