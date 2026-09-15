import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DIVISI_OPTIONS } from '@/lib/constants'
import { getDivisiKuota } from '@/lib/divisi-kuota'

export async function GET() {
  try {
    const kuota = await getDivisiKuota()
    const counts = await prisma.panitia.groupBy({
      by: ['divisi'],
      _count: { divisi: true },
    })

    const countMap: Record<string, number> = {}
    for (const c of counts) {
      countMap[c.divisi] = c._count.divisi
    }

    const capacity = DIVISI_OPTIONS.map((d) => {
      const max = kuota[d.value]
      const terisi = countMap[d.value] ?? 0
      return {
        divisi: d.value,
        label: d.label,
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