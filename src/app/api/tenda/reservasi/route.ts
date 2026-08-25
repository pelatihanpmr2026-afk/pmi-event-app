import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { dataSekolahMiniSchema } from '@/lib/validations/sekolah'
import { tendaSelectionSchema } from '@/lib/validations/tenda'
import { TENDA_RESERVASI_SEMENTARA_MENIT, TENDA_TOLERANSI } from '@/lib/constants-sekolah'
import { lockDanValidasiStokTenda } from '@/lib/tenda-stock'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'tenda-reservasi', max: 60, windowMs: 60 * 60 * 1000 })
    if (rl) return rl

    const body = await req.json()
    const sekolah = dataSekolahMiniSchema.safeParse(body.sekolah)
    const pilihan = tendaSelectionSchema.safeParse({ pilihan: body.pilihan })
    if (!sekolah.success || !pilihan.success || pilihan.data.pilihan.length === 0) return NextResponse.json({ success: false, message: 'Data reservasi tidak valid' }, { status: 400 })
    const jenis = await prisma.tendaJenis.findMany({ where: { id: { in: pilihan.data.pilihan.map((p) => p.tendaJenisId) } } })
    const estimasi = Number(sekolah.data.estimasiPesertaPendamping)
    const kapasitas = pilihan.data.pilihan.reduce((sum, p) => sum + jenis.find((t) => t.id === p.tendaJenisId)!.kapasitasMax * p.jumlah, 0)
    if (jenis.length !== pilihan.data.pilihan.length || kapasitas < estimasi || kapasitas > estimasi + TENDA_TOLERANSI) return NextResponse.json({ success: false, message: 'Pilihan tenda tidak sesuai kebutuhan' }, { status: 400 })
    const id = `resv_${nanoid(18)}`
    const expiresAt = new Date(Date.now() + TENDA_RESERVASI_SEMENTARA_MENIT * 60 * 1000)
    await prisma.$transaction(async (tx) => {
      await lockDanValidasiStokTenda(tx, 'draft', pilihan.data.pilihan)
      await tx.reservasiTenda.create({ data: { id, namaSekolah: sekolah.data.namaSekolah, kategori: sekolah.data.kategori, namaPembina: sekolah.data.namaPembina, noWhatsappPembina: sekolah.data.noWhatsappPembina, estimasiPesertaPendamping: estimasi, expiresAt, items: { create: pilihan.data.pilihan.map((p) => ({ tendaJenisId: p.tendaJenisId, jumlah: p.jumlah, hargaSatuan: jenis.find((t) => t.id === p.tendaJenisId)!.harga })) } } })
    })
    return NextResponse.json({ success: true, data: { id, expiresAt } }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('STOK_HABIS:')) return NextResponse.json({ success: false, message: 'Stok tenda sudah habis. Silakan pilih ulang.' }, { status: 409 })
    console.error('[POST /api/tenda/reservasi]', error); return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
