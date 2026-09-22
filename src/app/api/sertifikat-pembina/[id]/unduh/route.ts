import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSertifikatPembinaPdf } from '@/lib/generate-sertifikat-pembina'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/sertifikat-pembina/[id]/unduh
 *
 * Publik (tanpa login) — unduh PDF sertifikat per pembina. ID berupa cuid
 * acak sehingga tidak bisa ditebak; endpoint di-rate-limit.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRateLimit(req, { key: 'sertifikat-unduh', max: 20, windowMs: 60 * 60 * 1000 })
    if (rl) return rl

    const { id } = await params
    const pembina = await prisma.pembina.findUnique({
      where: { id },
      include: { sekolah: { select: { namaLengkap: true } } },
    })

    if (!pembina) return NextResponse.json({ success: false, message: 'Sertifikat tidak ditemukan' }, { status: 404 })

    const buffer = await generateSertifikatPembinaPdf({
      namaPembina: pembina.nama,
      namaSekolah: pembina.sekolah.namaLengkap,
    })

    const safeName = pembina.sekolah.namaLengkap.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Sekolah'
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Sertifikat_${safeName}_${pembina.nama.replace(/\s+/g, '_')}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/sertifikat-pembina/:id/unduh]', error)
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal membuat sertifikat' }, { status: 500 })
  }
}
