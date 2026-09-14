import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import type { AsalUnit, Divisi } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { generateExcelPanitiaLengkapBuffer } from '@/lib/generate-excel-panitia'
import { generatePdfPanitia } from '@/lib/generate-pdf-panitia'
import { ASAL_UNIT_OPTIONS, DIVISI_OPTIONS } from '@/lib/constants'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

function findLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * GET /api/panitia/export-lengkap?format=excel|pdf&search=&unit=&divisi=
 * Export sesuai isi tabel dashboard panitia: filter yang sama +
 * kolom kehadiran per sesi absensi.
 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const sp = req.nextUrl.searchParams
    const format = sp.get('format') ?? 'excel'
    if (format !== 'excel' && format !== 'pdf') {
      return NextResponse.json({ success: false, message: 'Format harus excel atau pdf' }, { status: 400 })
    }
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

    const [panitiaList, sesiList] = await Promise.all([
      prisma.panitia.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          nomorRegistrasi: true,
          nama: true,
          gender: true,
          noWhatsapp: true,
          alamat: true,
          asalUnit: true,
          divisi: true,
          status: true,
          createdAt: true,
          absensiLogs: { select: { sesiId: true } },
        },
      }),
      prisma.absensiSesi.findMany({ orderBy: { tanggal: 'asc' }, select: { id: true, nama: true } }),
    ])

    // Urutkan berdasarkan divisi mengikuti urutan DIVISI_OPTIONS,
    // lalu waktu pendaftaran di dalam tiap divisi.
    const urutanDivisi = (divisi: string) => {
      const idx = DIVISI_OPTIONS.findIndex((option) => option.value === divisi)
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
    }
    panitiaList.sort((a, b) => {
      const bandingDivisi = urutanDivisi(a.divisi) - urutanDivisi(b.divisi)
      if (bandingDivisi !== 0) return bandingDivisi
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    const rows = panitiaList.map((p) => ({
      nomorRegistrasi: p.nomorRegistrasi,
      nama: p.nama,
      gender: p.gender,
      noWhatsapp: p.noWhatsapp,
      alamat: p.alamat,
      asalUnit: findLabel(ASAL_UNIT_OPTIONS, p.asalUnit),
      divisi: findLabel(DIVISI_OPTIONS, p.divisi),
      hadirSesiIds: p.absensiLogs.map((l) => l.sesiId),
      status: p.status,
    }))

    const now = new Date()
    const filterParts = [
      search ? `Cari "${search}"` : null,
      unit ? findLabel(ASAL_UNIT_OPTIONS, unit) : null,
      divisi ? findLabel(DIVISI_OPTIONS, divisi) : null,
    ].filter(Boolean)

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'EXPORT_PANITIA_LENGKAP', {
      targetType: 'PANITIA',
      metadata: { format, search: search || '-', unit: unit || '-', divisi: divisi || '-', jumlahBaris: rows.length },
    })

    if (format === 'excel') {
      const buffer = await generateExcelPanitiaLengkapBuffer(rows, sesiList)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Data_Panitia_Lengkap_${ymd(now)}.xlsx"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const label = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const buffer = await generatePdfPanitia(label, filterParts.join(' · '), sesiList, rows, guard.session.nama)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Data_Panitia_Lengkap_${ymd(now)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/panitia/export-lengkap]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengekspor data panitia' }, { status: 500 })
  }
}
