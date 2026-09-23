import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/sertifikat-pembina/sekolah
 *
 * Publik (tanpa login) — seluruh daftar sekolah SEKALIGUS (hanya nama +
 * kategori + jumlah pembina, tanpa nama pembina). Frontend memfilter di
 * memori sehingga pencarian terasa instan (tanpa debounce/API per ketikan)
 * dan tidak ada hasil yang terpotong limit. Di-rate-limit.
 */
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'sertifikat-sekolah-list', max: 60, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const sekolahList = await prisma.sekolah.findMany({
      select: {
        id: true,
        namaLengkap: true,
        kategori: true,
        _count: { select: { pembina: true } },
      },
      orderBy: { namaLengkap: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: sekolahList.map((s) => ({
        id: s.id,
        namaSekolah: s.namaLengkap,
        kategori: s.kategori,
        jumlahPembina: s._count.pembina,
      })),
    })
  } catch (error) {
    console.error('[GET /api/sertifikat-pembina/sekolah]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
