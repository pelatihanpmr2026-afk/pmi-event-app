import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'
import { generatePdfSewaTendaList } from '@/lib/generate-pdf-sewa-tenda-list'

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Saring sekolah yang sewa tenda berdasarkan jenis tenda / vendor (opsional). */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const tendaJenisId = req.nextUrl.searchParams.get('tendaJenisId') ?? null
    const vendorFilter = req.nextUrl.searchParams.get('vendor')?.trim() || null

    const tendaOptions = await prisma.tendaJenis.findMany({ select: { id: true, nama: true, namaVendor: true } })
    const tendaTerpilih = tendaJenisId ? tendaOptions.find((t) => t.id === tendaJenisId) ?? null : null
    if (tendaJenisId && !tendaTerpilih) {
      return NextResponse.json({ success: false, message: 'Jenis tenda tidak ditemukan' }, { status: 400 })
    }

    const tendaIdsByVendor = vendorFilter
      ? tendaOptions.filter((t) => t.namaVendor?.trim() === vendorFilter).map((t) => t.id)
      : null

    const sekolahList = await prisma.sekolah.findMany({
      where: {
        tendaSewa: {
          some: tendaIdsByVendor
            ? { tendaJenisId: { in: tendaIdsByVendor } }
            : tendaJenisId
              ? { tendaJenisId }
              : {},
        },
        pembayaran: { some: { tipe: 'TENDA', statusPembayaran: 'LUNAS' } },
      },
      include: {
        tendaSewa: {
          include: { tendaJenis: { select: { nama: true } } },
          orderBy: { tendaJenis: { kapasitasMin: 'asc' } },
        },
        pembayaran: {
          where: { tipe: 'TENDA', statusPembayaran: 'LUNAS' },
          orderBy: { dikonfirmasiPada: 'desc' },
        },
      },
      orderBy: { namaLengkap: 'asc' },
    })

    const rows = sekolahList.map((s) => {
      const pembayaranTenda = s.pembayaran[0]
      return {
        kodePendaftaran: s.kodePendaftaran,
        namaSekolah: s.namaLengkap,
        tenda: s.tendaSewa.map((t) => ({ nama: t.tendaJenis.nama, jumlah: t.jumlah })),
        totalUnit: s.tendaSewa.reduce((sum, t) => sum + t.jumlah, 0),
        totalBiaya: pembayaranTenda?.jumlahBiaya ?? 0,
      }
    })

    const totalUnit = rows.reduce((sum, r) => sum + r.totalUnit, 0)
    const totalBiaya = rows.reduce((sum, r) => sum + r.totalBiaya, 0)

    const now = new Date()
    const label = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const filterParts: string[] = []
    if (tendaTerpilih) filterParts.push(`JENIS TENDA : ${tendaTerpilih.nama}`)
    if (vendorFilter) filterParts.push(`VENDOR : ${vendorFilter}`)
    const filterLabel = filterParts.length > 0 ? filterParts.join(' | ') : 'SEMUA JENIS TENDA & VENDOR'

    const buffer = await generatePdfSewaTendaList(
      label,
      filterLabel,
      rows,
      { totalSekolah: rows.length, totalUnit, totalBiaya },
      guard.session.nama
    )

    const slugParts: string[] = []
    if (tendaTerpilih) slugParts.push(tendaTerpilih.nama)
    if (vendorFilter) slugParts.push(vendorFilter)
    const fileSlug = slugParts.length > 0 ? slugParts.join('_').replace(/[^a-z0-9]+/gi, '_') : 'Semua'
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Sewa_Tenda_${fileSlug}_${ymd(now)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/tenda/sewa-list/download]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}