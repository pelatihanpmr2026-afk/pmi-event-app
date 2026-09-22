import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/sertifikat-pembina/cari?nama=...&sekolah=...
 *
 * Publik (tanpa login) — pembina mencari sertifikatnya berdasarkan nama
 * pembina + nama sekolah. Di-rate-limit agar tidak bisa di-scrape massal.
 */
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'sertifikat-cari', max: 30, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const { searchParams } = new URL(req.url)
    const nama = (searchParams.get('nama') ?? '').trim()
    const sekolah = (searchParams.get('sekolah') ?? '').trim()

    if (nama.length < 3 && sekolah.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Masukkan minimal 3 karakter nama pembina atau nama sekolah' },
        { status: 400 }
      )
    }

    const hasil = await prisma.pembina.findMany({
      where: {
        ...(nama ? { nama: { contains: nama } } : {}),
        ...(sekolah ? { sekolah: { namaLengkap: { contains: sekolah } } } : {}),
      },
      include: { sekolah: { select: { namaLengkap: true, kategori: true } } },
      orderBy: [{ sekolah: { namaLengkap: 'asc' } }, { nama: 'asc' }],
      take: 20,
    })

    return NextResponse.json({
      success: true,
      data: hasil.map((p) => ({
        id: p.id,
        namaPembina: p.nama,
        namaSekolah: p.sekolah.namaLengkap,
        kategori: p.sekolah.kategori,
      })),
    })
  } catch (error) {
    console.error('[GET /api/sertifikat-pembina/cari]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
