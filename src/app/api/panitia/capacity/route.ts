import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DIVISI_CAPACITY } from '@/lib/constants'

export async function GET() {
  try {
    const counts = await prisma.panitia.groupBy({
      by: ['divisi'],
      _count: { divisi: true },
    })

    const countMap: Record<string, number> = {}
    for (const c of counts) {
      countMap[c.divisi] = c._count.divisi
    }

    const capacity = Object.entries(DIVISI_CAPACITY).map(([divisi, max]) => {
      const terisi = countMap[divisi] ?? 0
      return {
        divisi,
        max,
        terisi,
        sisa: Math.max(max - terisi, 0),
        penuh: terisi >= max,
      }
    })

    return NextResponse.json({ success: true, data: capacity })
  } catch (error) {
    console.error('[GET /api/panitia/capacity]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}