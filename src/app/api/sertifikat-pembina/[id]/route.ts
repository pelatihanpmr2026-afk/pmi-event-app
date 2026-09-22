import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { toInternational } from '@/lib/whatsapp'

/**
 * PATCH /api/sertifikat-pembina/[id]
 *
 * Publik (tanpa login) — koreksi nama pembina oleh yang bersangkutan.
 * Verifikasi: user wajib memasukkan No. WhatsApp yang terdaftar saat
 * pendaftaran sekolah (cocok dengan sekolah.noWhatsappPembina).
 * Rate-limit ketat (5x/jam) + tidak mengembalikan data sensitif.
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
    const noWa = (body?.noWa ?? '').trim()

    if (!namaBaru || namaBaru.length < 3) {
      return NextResponse.json({ success: false, message: 'Nama baru minimal 3 karakter' }, { status: 400 })
    }
    if (!noWa || noWa.replace(/\D/g, '').length < 9) {
      return NextResponse.json({ success: false, message: 'Nomor WhatsApp tidak valid' }, { status: 400 })
    }

    const pembina = await prisma.pembina.findUnique({
      where: { id },
      include: { sekolah: { select: { id: true, namaLengkap: true, noWhatsappPembina: true } } },
    })
    if (!pembina) return NextResponse.json({ success: false, message: 'Data tidak ditemukan' }, { status: 404 })

    if (toInternational(noWa) !== toInternational(pembina.sekolah.noWhatsappPembina)) {
      return NextResponse.json(
        { success: false, message: 'Nomor WhatsApp tidak cocok dengan data pendaftaran sekolah ini' },
        { status: 403 }
      )
    }

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
