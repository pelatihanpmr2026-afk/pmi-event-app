import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-guard'
import { getRekapSewaTenda } from '@/lib/rekap-sewa-tenda'
import { generatePdfRekapSewaTenda } from '@/lib/generate-pdf-rekap-sewa-tenda'

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const kategori = req.nextUrl.searchParams.get('kategori')?.toUpperCase()
    if (kategori !== 'WIRA' && kategori !== 'MADYA') {
      return NextResponse.json(
        { success: false, message: 'Parameter kategori harus WIRA atau MADYA' },
        { status: 400 }
      )
    }

    const { wira, madya } = await getRekapSewaTenda()
    const rows = kategori === 'WIRA' ? wira : madya
    const totalUnit = rows.reduce((sum, r) => sum + r.totalUnit, 0)
    const totalBiaya = rows.reduce((sum, r) => sum + r.totalBiaya, 0)

    const now = new Date()
    const label = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    const buffer = await generatePdfRekapSewaTenda(
      label,
      kategori,
      rows,
      { totalSekolah: rows.length, totalUnit, totalBiaya },
      guard.session.nama
    )
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rekap_Sewa_Tenda_${kategori}_${ymd(now)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/tenda/rekap-sewa/download]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}