import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-guard'
import { getRekapDataSekolah } from '@/lib/rekap-data-sekolah'
import { generatePdfRekapDataSekolah } from '@/lib/generate-pdf-rekap-data-sekolah'

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function GET() {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { wira, madya, totals } = await getRekapDataSekolah()

    const now = new Date()
    const label = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    const buffer = await generatePdfRekapDataSekolah(label, wira, madya, totals, guard.session.nama)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rekap_Data_Sekolah_${ymd(now)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/sekolah/rekap-data/download]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}