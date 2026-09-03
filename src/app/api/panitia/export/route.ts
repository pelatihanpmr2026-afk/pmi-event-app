import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { Prisma } from '@prisma/client'
import type { Divisi } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAbsolutePathFromUrl } from '@/lib/save-file'
import { generateExcelPanitiaPerDivisiBuffer } from '@/lib/generate-excel-panitia'
import { DIVISI_OPTIONS } from '@/lib/constants'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const divisi = req.nextUrl.searchParams.get('divisi')?.trim() ?? ''
    const validDivisi = DIVISI_OPTIONS.some((option) => option.value === divisi)
    const where: Prisma.PanitiaWhereInput = validDivisi ? { divisi: divisi as Divisi } : {}

    const panitiaList = await prisma.panitia.findMany({
      where,
      orderBy: [{ divisi: 'asc' }, { createdAt: 'asc' }],
      select: {
        nomorRegistrasi: true,
        nama: true,
        gender: true,
        noWhatsapp: true,
        alamat: true,
        asalUnit: true,
        divisi: true,
        status: true,
        fotoUrl: true,
      },
    })

    const rows = await Promise.all(panitiaList.map(async (panitia) => {
      let fotoBuffer: Buffer | null = null
      try {
        fotoBuffer = await readFile(getAbsolutePathFromUrl(panitia.fotoUrl))
      } catch {
        // Export tetap dilanjutkan jika foto runtime tidak ditemukan.
      }
      return { ...panitia, fotoBuffer }
    }))

    const buffer = await generateExcelPanitiaPerDivisiBuffer(rows)
    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'EXPORT_PANITIA_PER_DIVISI', {
      targetType: 'PANITIA',
      metadata: { divisi: validDivisi ? divisi : '-', jumlahBaris: rows.length },
    })

    const suffix = validDivisi ? `_${divisi}` : '_Semua_Divisi'
    const filename = `Data_Panitia${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/panitia/export]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengekspor data panitia' }, { status: 500 })
  }
}
