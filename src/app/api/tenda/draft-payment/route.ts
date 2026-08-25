import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import type { Jenjang, StatusSekolah } from '@prisma/client'
import { nanoid } from 'nanoid'
import { readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { dataSekolahMiniSchema } from '@/lib/validations/sekolah'
import { tendaSelectionSchema } from '@/lib/validations/tenda'
import { normalizeNamaSekolah, namaSekolahKey, generateKodePendaftaran, sanitizeFilename } from '@/lib/sekolah'
import { ACCEPTED_BUKTI_TYPES, MAX_BUKTI_SIZE, TENDA_TOLERANSI } from '@/lib/constants-sekolah'
import { getFileExtension, saveUploadedFile, getAbsolutePathFromUrl } from '@/lib/save-file'
import { generateQrCode } from '@/lib/generate-qrcode'
import { generateKwitansi, type KwitansiLineItem } from '@/lib/generate-kwitansi'
import { lockDanValidasiStokTenda } from '@/lib/tenda-stock'
import { createTendaSessionToken, TENDA_SESSION_COOKIE, TENDA_SESSION_MAX_AGE } from '@/lib/tenda-session'
import { checkRateLimit } from '@/lib/rate-limit'

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'tenda-draft', max: 60, windowMs: 60 * 60 * 1000 })
    if (rl) return rl

    const form = await req.formData()
    const reservationId = form.get('reservationId')?.toString() ?? ''
    const reservasi = await prisma.reservasiTenda.findUnique({ where: { id: reservationId }, include: { items: true } })
    if (!reservasi || reservasi.expiresAt <= new Date()) return NextResponse.json({ success: false, message: 'Reservasi sudah kedaluwarsa. Silakan pilih tenda kembali.' }, { status: 409 })
    const sekolahData = dataSekolahMiniSchema.safeParse({ namaSekolah: reservasi.namaSekolah, kategori: reservasi.kategori, namaPembina: reservasi.namaPembina, noWhatsappPembina: reservasi.noWhatsappPembina, estimasiPesertaPendamping: String(reservasi.estimasiPesertaPendamping) })
    const pilihanData = tendaSelectionSchema.safeParse({ pilihan: reservasi.items.map((item) => ({ tendaJenisId: item.tendaJenisId, jumlah: item.jumlah })) })
    const file = form.get('buktiTransfer')
    if (!sekolahData.success || !pilihanData.success) return NextResponse.json({ success: false, message: 'Data sewa tenda tidak valid' }, { status: 400 })
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ success: false, message: 'Bukti transfer wajib diupload' }, { status: 400 })
    if (file.size > MAX_BUKTI_SIZE || !ACCEPTED_BUKTI_TYPES.includes(file.type)) return NextResponse.json({ success: false, message: 'Bukti transfer harus JPG, PNG, atau PDF dengan ukuran maksimal 5MB' }, { status: 400 })

    const { pilihan } = pilihanData.data
    if (pilihan.length === 0) return NextResponse.json({ success: false, message: 'Pilih minimal satu tenda' }, { status: 400 })
    const namaLengkap = normalizeNamaSekolah(sekolahData.data.namaSekolah)
    const existing = await prisma.sekolah.findMany({ select: { namaLengkap: true } })
    if (existing.some((s) => namaSekolahKey(s.namaLengkap) === namaSekolahKey(namaLengkap))) return NextResponse.json({ success: false, message: 'Sekolah ini sudah terdaftar. Gunakan menu Cari Sekolah.' }, { status: 409 })

    const jenis = await prisma.tendaJenis.findMany({ where: { id: { in: pilihan.map((p) => p.tendaJenisId) } } })
    if (jenis.length !== pilihan.length) return NextResponse.json({ success: false, message: 'Jenis tenda tidak ditemukan' }, { status: 400 })
    const kapasitas = pilihan.reduce((total, p) => total + jenis.find((t) => t.id === p.tendaJenisId)!.kapasitasMax * p.jumlah, 0)
    const estimasi = Number(sekolahData.data.estimasiPesertaPendamping)
    if (kapasitas < estimasi || kapasitas > estimasi + TENDA_TOLERANSI) return NextResponse.json({ success: false, message: 'Kapasitas tenda tidak sesuai kebutuhan' }, { status: 400 })

    const buktiTransferUrl = await saveUploadedFile(file, 'bukti-transfer', `${nanoid(10)}${getFileExtension(file.name)}`)
    const kode = await generateKodePendaftaran(namaLengkap, sekolahData.data.kategori)
    const dibayarPada = new Date()

    // Kwitansi tenda digenerate langsung setelah bukti transfer dikirim — bisa
    // didownload meski admin belum mengkonfirmasi pembayaran.
    const qrToken = nanoid(24)
    let kwitansiUrl: string | null = null
    try {
      const qrFilename = `kwitansi-${nanoid(10)}.png`
      const verifikasiUrl = `${getBaseUrl()}/kwitansi/verifikasi/${qrToken}`
      const qrCodeUrl = await generateQrCode(verifikasiUrl, qrFilename)
      const qrCodeBuffer = await readFile(getAbsolutePathFromUrl(qrCodeUrl))
      const items: KwitansiLineItem[] = pilihan.map((p) => {
        const t = jenis.find((j) => j.id === p.tendaJenisId)!
        return { label: t.nama, qty: p.jumlah, hargaSatuan: t.harga, subtotal: t.harga * p.jumlah }
      })
      const total = items.reduce((sum, i) => sum + i.subtotal, 0)
      const nomorKwitansi = `KW-${sanitizeFilename(kode.kodePendaftaran)}-TENDA`
      kwitansiUrl = await generateKwitansi({
        nomorKwitansi,
        tipe: 'TENDA',
        namaSekolah: namaLengkap,
        namaPembina: sekolahData.data.namaPembina,
        kodePendaftaran: kode.kodePendaftaran,
        tanggalBayar: dibayarPada,
        items,
        total,
        qrCodeBuffer,
        filename: `${sanitizeFilename(nomorKwitansi)}.pdf`,
      })
    } catch (kwitansiError) {
      console.error('[POST /api/tenda/draft-payment] Gagal generate kwitansi:', kwitansiError)
    }

    const result = await prisma.$transaction(async (tx) => {
      await lockDanValidasiStokTenda(tx, 'draft', pilihan, reservationId)
      const sekolah = await tx.sekolah.create({ data: { jenjang: 'SMA' as Jenjang, statusSekolah: 'SWASTA' as StatusSekolah, namaInput: namaLengkap, namaLengkap, kategori: sekolahData.data.kategori, ...kode, namaPembina: sekolahData.data.namaPembina, noWhatsappPembina: sekolahData.data.noWhatsappPembina, estimasiPesertaPendamping: estimasi } })
      await tx.tendaSewa.createMany({ data: pilihan.map((p) => ({ sekolahId: sekolah.id, tendaJenisId: p.tendaJenisId, jumlah: p.jumlah, hargaSatuanSaatSewa: jenis.find((t) => t.id === p.tendaJenisId)!.harga })) })
      await tx.pembayaran.create({ data: { sekolahId: sekolah.id, tipe: 'TENDA', batchKe: 1, jumlahBiaya: pilihan.reduce((total, p) => total + jenis.find((t) => t.id === p.tendaJenisId)!.harga * p.jumlah, 0), statusPembayaran: 'MENUNGGU_KONFIRMASI', buktiTransferUrl, dibayarPada, qrToken, kwitansiUrl } })
      await tx.reservasiTenda.delete({ where: { id: reservationId } })
      return sekolah
    })
    const token = await createTendaSessionToken(result.id)
    const response = NextResponse.json({ success: true, data: { sekolahId: result.id } }, { status: 201 })
    response.cookies.set(TENDA_SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: TENDA_SESSION_MAX_AGE, path: `/api/sekolah/${result.id}` })
    return response
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('STOK_HABIS:')) return NextResponse.json({ success: false, message: 'Stok tenda sudah berubah. Silakan pilih ulang.' }, { status: 409 })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ success: false, message: 'Sekolah atau kode pendaftaran sudah digunakan. Silakan coba lagi.' }, { status: 409 })
    console.error('[POST /api/tenda/draft-payment]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
