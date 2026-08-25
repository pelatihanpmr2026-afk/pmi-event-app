import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { generatePdfPengajuanBuffer } from '@/lib/generate-pdf-pengajuan'
import { getAbsolutePathFromUrl } from '@/lib/save-file'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/pengajuan-anggaran/:id/pdf
 * Generate ulang PDF pengajuan dari data terkini lalu kirim langsung sebagai
 * download. Dipakai tombol "Download PDF" di halaman sukses dan modal admin
 * supaya PDF selalu segar (misal setelah item diedit), bukan file statis lama.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRateLimit(req, { key: 'pengajuan-download', max: 60, windowMs: 60 * 60 * 1000 })
    if (rl) return rl

    const { id } = await params
    const pengajuan = await prisma.pengajuanAnggaran.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!pengajuan) {
      return NextResponse.json({ success: false, message: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    let tandaTanganBuffer: Buffer | null = null
    if (pengajuan.tandaTanganUrl) {
      try {
        tandaTanganBuffer = await readFile(getAbsolutePathFromUrl(pengajuan.tandaTanganUrl))
      } catch {
        tandaTanganBuffer = null
      }
    }

    const pdfBuffer = await generatePdfPengajuanBuffer({
      nomorPengajuan: pengajuan.nomorPengajuan,
      tanggal: pengajuan.createdAt,
      namaKoordinator: pengajuan.namaKoordinator,
      divisi: pengajuan.divisi,
      noHp: pengajuan.noHp,
      items: pengajuan.items,
      totalJenisBarang: pengajuan.totalJenisBarang,
      totalKuantitas: pengajuan.totalKuantitas,
      totalPengajuan: pengajuan.totalPengajuan,
      tandaTanganBuffer,
    })

    const filename = `${pengajuan.nomorPengajuan.replace(/\s+/g, '_')}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[POST /api/pengajuan-anggaran/:id/pdf]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat membuat PDF' },
      { status: 500 }
    )
  }
}