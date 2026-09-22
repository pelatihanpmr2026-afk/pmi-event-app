import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * PATCH /api/sertifikat-pembina/[id]
 *
 * Publik (tanpa login) — koreksi nama pembina oleh yang bersangkutan.
 * Tanpa verifikasi nomor; dilindungi rate-limit ketat (5x/jam).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRateLimit(req, { key: 'sertifikat-edit', max: 5, windowMs: 60 * 60 * 1000 })
    if (rl) return rl

    const { id } = await params
    const body = await req.json().catch(() => null)
    const namaBaru = (body?.namaBaru ?? '').trim()

    if (!namaBaru || namaBaru.length < 3) {
      return NextResponse.json({ success: false, message: 'Nama baru minimal 3 karakter' }, { status: 400 })
    }

    const pembina = await prisma.pembina.findUnique({
      where: { id },
      include: { sekolah: { select: { id: true, namaLengkap: true } } },
    })
    if (!pembina) return NextResponse.json({ success: false, message: 'Data tidak ditemukan' }, { status: 404 })

    if (namaBaru === pembina.nama) {
      return NextResponse.json({ success: false, message: 'Nama baru sama dengan nama saat ini' }, { status: 400 })
    }

    await prisma.pembina.update({ where: { id }, data: { nama: namaBaru } })
    console.log(
      `[sertifikat-pembina:edit] ${pembina.sekolah.namaLengkap}: "${pembina.nama}" → "${namaBaru}"`
    )

    return NextResponse.json({ success: true, message: 'Nama berhasil diperbarui. Silakan unduh ulang sertifikat.' })
  } catch (error) {
    console.error('[PATCH /api/sertifikat-pembina/:id]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
