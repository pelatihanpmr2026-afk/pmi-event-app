import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/sertifikat-pembina/sekolah/[sekolahId]/pembina
 *
 * Publik (tanpa login) — daftar pembina SATU sekolah yang sudah dipilih user.
 * Di-rate-limit. ID sekolah saja tidak cukup untuk enumerasi massal karena
 * user harus tahu/menebak nama sekolahnya dulu via pencarian.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sekolahId: string }> }
) {
  try {
    const rl = checkRateLimit(req, { key: 'sertifikat-pembina-list', max: 30, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const { sekolahId } = await params
    const sekolah = await prisma.sekolah.findUnique({
      where: { id: sekolahId },
      select: {
        id: true,
        namaLengkap: true,
        kategori: true,
        pembina: { select: { id: true, nama: true }, orderBy: { nama: 'asc' } },
      },
    })

    if (!sekolah) return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })

    return NextResponse.json({
      success: true,
      data: {
        sekolahId: sekolah.id,
        namaSekolah: sekolah.namaLengkap,
        kategori: sekolah.kategori,
        pembina: sekolah.pembina.map((p) => ({ id: p.id, namaPembina: p.nama })),
      },
    })
  } catch (error) {
    console.error('[GET /api/sertifikat-pembina/sekolah/:id/pembina]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
