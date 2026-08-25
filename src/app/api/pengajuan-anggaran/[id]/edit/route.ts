import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeNoWa } from '@/lib/validations/susulan'
import { itemBarangArraySchema } from '@/lib/validations/pengajuan-anggaran'
import {
  updatePengajuanItems,
  NotFoundPengajuanError,
  PengajuanTerkunciError,
} from '@/lib/pengajuan-items'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/pengajuan-anggaran/:id/edit
 *
 * Edit/tambah item oleh koordinator (pengaju) dengan verifikasi No. WhatsApp
 * yang terdaftar. Hanya bisa saat status MENUNGGU — pengajuan yang sudah
 * diproses (DISETUJUI/DITOLAK) terkunci. Setelah edit, status tetap MENUNGGU
 * dan PDF diregenerasi (versi revisi).
 *
 * Body: { noHp, items: [{ namaBarang, qty, hargaSatuan }] } (qty/harga angka)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, { key: 'pengajuan-edit', max: 30, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const { id } = await params

    const body = await req.json()
    const parsed = itemBarangArraySchema.safeParse(body.items)
    const noHp = typeof body.noHp === 'string' ? body.noHp.trim() : ''

    if (noHp.length < 6) {
      return NextResponse.json({ success: false, message: 'Nomor WhatsApp wajib diisi' }, { status: 400 })
    }
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data barang tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const pengajuan = await prisma.pengajuanAnggaran.findUnique({ where: { id } })

    if (!pengajuan) {
      return NextResponse.json({ success: false, message: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    // Verifikasi kepemilikan — nomor WA koordinator harus cocok dengan yang terdaftar.
    if (normalizeNoWa(pengajuan.noHp) !== normalizeNoWa(noHp)) {
      return NextResponse.json(
        { success: false, message: 'No. WhatsApp koordinator tidak cocok dengan pengajuan ini' },
        { status: 404 }
      )
    }

    const items = parsed.data.map((it) => ({
      namaBarang: it.namaBarang,
      qty: Number(it.qty),
      hargaSatuan: Number(it.hargaSatuan),
    }))

    let updated
    try {
      updated = await updatePengajuanItems(id, items)
    } catch (error) {
      if (error instanceof NotFoundPengajuanError) {
        return NextResponse.json({ success: false, message: 'Pengajuan tidak ditemukan' }, { status: 404 })
      }
      if (error instanceof PengajuanTerkunciError) {
        return NextResponse.json(
          { success: false, message: 'Pengajuan yang sudah diproses tidak bisa diedit lagi' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, message: 'Pengajuan berhasil diperbarui', data: updated })
  } catch (error) {
    console.error('[POST /api/pengajuan-anggaran/:id/edit]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}