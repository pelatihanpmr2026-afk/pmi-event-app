import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveUploadedFile, getFileExtension } from '@/lib/save-file'
import { ACCEPTED_BUKTI_TYPES, MAX_BUKTI_SIZE } from '@/lib/constants-sekolah'
import { nanoid } from 'nanoid'
import type { TipePembayaran } from '@prisma/client'
import { generateQrCode } from '@/lib/generate-qrcode'
import { generateKwitansi, type KwitansiLineItem } from '@/lib/generate-kwitansi'
import { sanitizeFilename } from '@/lib/sekolah'
import { getAbsolutePathFromUrl } from '@/lib/save-file'
import { readFile } from 'fs/promises'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from '@/lib/constants-sekolah'

function parseTipe(tipeParam: string): TipePembayaran | null {
  const upper = tipeParam.toUpperCase()
  if (upper === 'PESERTA' || upper === 'TENDA') return upper as TipePembayaran
  return null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tipe: string }> }
) {
  try {
    const { id, tipe: tipeParam } = await params
    const tipe = parseTipe(tipeParam)

    if (!tipe) {
      return NextResponse.json({ success: false, message: 'Tipe pembayaran tidak valid' }, { status: 400 })
    }

   const sekolah = await prisma.sekolah.findUnique({
  where: { id },
  include: {
    peserta: { select: { tipe: true } },
    pembayaran: { where: { tipe } },
    tendaSewa: { include: { tendaJenis: { select: { nama: true } } } },
  },
})

    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }

    const pembayaran = sekolah.pembayaran[0] ?? null

    if (!pembayaran) {
      return NextResponse.json(
        { success: false, message: 'Belum ada tagihan untuk tipe pembayaran ini' },
        { status: 404 }
      )
    }

   const jumlahPeserta = sekolah.peserta.filter((p) => p.tipe === 'PESERTA').length
const jumlahPendamping = sekolah.peserta.filter((p) => p.tipe === 'PENDAMPING').length

const tendaSewaList =
  tipe === 'TENDA'
    ? sekolah.tendaSewa.map((t) => ({
        nama: t.tendaJenis.nama,
        jumlah: t.jumlah,
        hargaSatuan: t.hargaSatuanSaatSewa,
        subtotal: t.jumlah * t.hargaSatuanSaatSewa,
      }))
    : undefined

return NextResponse.json({
  success: true,
  data: {
    id: pembayaran.id,
    tipe: pembayaran.tipe,
    namaLengkap: sekolah.namaLengkap,
    kodePendaftaran: sekolah.kodePendaftaran,
    jumlahBiaya: pembayaran.jumlahBiaya,
    statusPembayaran: pembayaran.statusPembayaran,
    buktiTransferUrl: pembayaran.buktiTransferUrl,
    kwitansiUrl: pembayaran.kwitansiUrl,
    catatanAdmin: pembayaran.catatanAdmin,
    dibayarPada: pembayaran.dibayarPada,
    dikonfirmasiPada: pembayaran.dikonfirmasiPada,
    jumlahPeserta: tipe === 'PESERTA' ? jumlahPeserta : undefined,
    jumlahPendamping: tipe === 'PESERTA' ? jumlahPendamping : undefined,
    tendaSewaList,
  },
})
  } catch (error) {
    console.error('[GET /api/sekolah/:id/pembayaran/:tipe]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tipe: string }> }
) {
  try {
    const { id, tipe: tipeParam } = await params
    const tipe = parseTipe(tipeParam)

    if (!tipe) {
      return NextResponse.json({ success: false, message: 'Tipe pembayaran tidak valid' }, { status: 400 })
    }

    const pembayaran = await prisma.pembayaran.findUnique({
      where: { sekolahId_tipe: { sekolahId: id, tipe } },
    })

    if (!pembayaran) {
      return NextResponse.json({ success: false, message: 'Tagihan tidak ditemukan' }, { status: 404 })
    }

    if (pembayaran.statusPembayaran === 'MENUNGGU_KONFIRMASI' || pembayaran.statusPembayaran === 'LUNAS') {
      return NextResponse.json(
        { success: false, message: 'Bukti transfer sudah pernah diupload dan sedang/sudah diproses' },
        { status: 409 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('buktiTransfer') as File | null

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, message: 'Bukti transfer wajib diupload' }, { status: 400 })
    }

    if (file.size > MAX_BUKTI_SIZE) {
      return NextResponse.json({ success: false, message: 'Ukuran file maksimal 5MB' }, { status: 400 })
    }

    if (!ACCEPTED_BUKTI_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Format file harus JPG, PNG, atau PDF' },
        { status: 400 }
      )
    }

const ext = getFileExtension(file.name)
    const filename = `${nanoid(10)}${ext}`
    const buktiTransferUrl = await saveUploadedFile(file, 'bukti-transfer', filename)
    const dibayarPada = new Date()

    // Ambil data sekolah lengkap untuk keperluan isi kwitansi
    const sekolahFull = await prisma.sekolah.findUniqueOrThrow({
      where: { id },
      include: {
        peserta: { select: { tipe: true } },
        tendaSewa: { include: { tendaJenis: { select: { nama: true } } } },
      },
    })

    // Pakai qrToken lama kalau sudah ada (kasus upload ulang setelah ditolak),
    // supaya kwitansi lama yang terlanjur dicetak/disimpan pendaftar tetap valid discan.
    const qrToken = pembayaran.qrToken ?? nanoid(24)

    let kwitansiUrl: string | null = pembayaran.kwitansiUrl

    try {
      const qrFilename = `kwitansi-${nanoid(10)}.png`
      const qrCodeUrl = await generateQrCode(qrToken, qrFilename)
      const qrCodeBuffer = await readFile(getAbsolutePathFromUrl(qrCodeUrl))

      let items: KwitansiLineItem[]
      if (tipe === 'PESERTA') {
        const jp = sekolahFull.peserta.filter((p) => p.tipe === 'PESERTA').length
        const jd = sekolahFull.peserta.filter((p) => p.tipe === 'PENDAMPING').length
        items = [
          { label: 'Peserta', qty: jp, hargaSatuan: BIAYA_PESERTA, subtotal: jp * BIAYA_PESERTA },
          { label: 'Pendamping', qty: jd, hargaSatuan: BIAYA_PENDAMPING, subtotal: jd * BIAYA_PENDAMPING },
        ].filter((item) => item.qty > 0)
      } else {
        items = sekolahFull.tendaSewa.map((t) => ({
          label: t.tendaJenis.nama,
          qty: t.jumlah,
          hargaSatuan: t.hargaSatuanSaatSewa,
          subtotal: t.jumlah * t.hargaSatuanSaatSewa,
        }))
      }

      const nomorKwitansi = `KW-${sanitizeFilename(sekolahFull.kodePendaftaran)}-${tipe}`

      kwitansiUrl = await generateKwitansi({
        nomorKwitansi,
        tipe,
        namaSekolah: sekolahFull.namaLengkap,
        namaPembina: sekolahFull.namaPembina,
        kodePendaftaran: sekolahFull.kodePendaftaran,
        tanggalBayar: dibayarPada,
        items,
        total: pembayaran.jumlahBiaya,
        qrCodeBuffer,
        filename: `${sanitizeFilename(nomorKwitansi)}.pdf`,
      })
    } catch (kwitansiError) {
      // Kegagalan generate kwitansi tidak menggagalkan upload bukti transfer —
      // data pembayaran tetap tercatat, admin bisa generate ulang manual nanti.
      console.error('[POST pembayaran] Gagal generate kwitansi:', kwitansiError)
    }

    const updated = await prisma.pembayaran.update({
      where: { id: pembayaran.id },
      data: {
        buktiTransferUrl,
        statusPembayaran: 'MENUNGGU_KONFIRMASI',
        catatanAdmin: null,
        dibayarPada,
        qrToken,
        kwitansiUrl,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Bukti transfer berhasil diupload, kwitansi sudah bisa didownload',
      data: { statusPembayaran: updated.statusPembayaran, kwitansiUrl: updated.kwitansiUrl },
    })
  } catch (error) {
    console.error('[POST /api/sekolah/:id/pembayaran/:tipe]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}