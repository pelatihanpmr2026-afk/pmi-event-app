import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import type { AsalUnit, Divisi } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { generateIdCardPdf } from '@/lib/generate-idcard-pdf'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * GET /api/panitia/export-idcard?search=&unit=&divisi=
 * Gabungkan semua ID card panitia (PNG per panitia) menjadi satu file PDF
 * berukuran KTA (CR80 portrait) untuk dicetak langsung.
 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const sp = req.nextUrl.searchParams
    const search = (sp.get('search') ?? '').trim()
    const unit = (sp.get('unit') ?? '').trim()
    const divisi = (sp.get('divisi') ?? '').trim()

    const where: Prisma.PanitiaWhereInput = {
      ...(search
        ? { OR: [{ nama: { contains: search } }, { nomorRegistrasi: { contains: search } }] }
        : {}),
      ...(unit ? { asalUnit: unit as AsalUnit } : {}),
      ...(divisi ? { divisi: divisi as Divisi } : {}),
    }

    const panitiaList = await prisma.panitia.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        nama: true,
        nomorRegistrasi: true,
        divisi: true,
        idCardUrl: true,
      },
    })

    const items = panitiaList
      .filter((p) => p.idCardUrl && p.idCardUrl.trim() !== '')
      .map((p) => ({ nama: p.nama, imageUrl: p.idCardUrl }))

    const berjumlah = items.length

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'EXPORT_IDCARD_PANITIA', {
      targetType: 'PANITIA',
      metadata: { search: search || '-', unit: unit || '-', divisi: divisi || '-', jumlahPanitia: panitiaList.length, jumlahIdCard: berjumlah },
    })

    const buffer = await generateIdCardPdf(items)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ID_Card_Panitia_${ymd(new Date())}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/panitia/export-idcard]', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Gagal membuat file ID card' },
      { status: 500 }
    )
  }
}