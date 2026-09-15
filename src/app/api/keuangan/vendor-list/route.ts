import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'

export async function GET() {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const tendaJenis = await prisma.tendaJenis.findMany({
      where: { namaVendor: { not: null } },
      select: { namaVendor: true },
    })

    const vendorSet = new Set<string>()
    for (const t of tendaJenis) {
      const vendor = t.namaVendor?.trim()
      if (vendor) vendorSet.add(vendor)
    }

    const data = [...vendorSet]
      .sort((a, b) => a.localeCompare(b))
      .map((vendor) => ({ value: vendor, label: vendor }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/keuangan/vendor-list]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}