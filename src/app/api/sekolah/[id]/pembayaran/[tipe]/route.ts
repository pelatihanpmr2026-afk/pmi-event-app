import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveUploadedFile, getFileExtension, getAbsolutePathFromUrl } from '@/lib/save-file'
import { ACCEPTED_BUKTI_TYPES, MAX_BUKTI_SIZE } from '@/lib/constants-sekolah'
import { nanoid } from 'nanoid'
import { readFile } from 'fs/promises'
import { generateQrCode } from '@/lib/generate-qrcode'
import { generateKwitansi, type KwitansiLineItem } from '@/lib/generate-kwitansi'
import { sanitizeFilename } from '@/lib/sekolah'
import { lockDanValidasiStokTenda } from '@/lib/tenda-stock'
import { hasTendaSession, TENDA_SESSION_COOKIE } from '@/lib/tenda-session'
import { hasPaymentSession, PAYMENT_SESSION_COOKIE } from '@/lib/payment-session'
import { checkRateLimit } from '@/lib/rate-limit'
import type { TipePembayaran, Pembayaran } from '@prisma/client'

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

function parseTipe(tipeParam: string): TipePembayaran | null {
  const upper = tipeParam.toUpperCase()
  if (upper === 'PESERTA' || upper === 'TENDA') return upper as TipePembayaran
  return null
}

/**
 * Cari baris Pembayaran yang relevan untuk sekolahId+tipe ini.
 *
 * DULU: `prisma.pembayaran.findUnique({ where: { sekolahId_tipe: ... } })`
 * — valid selama 1 sekolah cuma boleh punya 1 baris Pembayaran per tipe.
 * SEKARANG: bisa ada banyak baris (1 per batch susulan), jadi:
 * - Kalau `pembayaranId` dikirim eksplisit (dari link "Batch 2" di halaman
 *   status), pakai itu.
 * - Kalau tidak, ambil baris yang PALING BUTUH PERHATIAN dulu: yang masih
 *   BELUM_BAYAR/DITOLAK (perlu upload), lalu MENUNGGU_KONFIRMASI, baru
 *   LUNAS — supaya link lama (tanpa pembayaranId, dari sebelum ada fitur
 *   susulan) tetap menunjukkan tagihan yang paling relevan buat pembina.
 */
async function findRelevantPembayaran(
  sekolahId: string,
  tipe: TipePembayaran,
  pembayaranId: string | null
): Promise<Pembayaran | null> {
  if (pembayaranId) {
    const byId = await prisma.pembayaran.findUnique({ where: { id: pembayaranId } })
    if (byId && byId.sekolahId === sekolahId && byId.tipe === tipe) return byId
    return null
  }

  const semua = await prisma.pembayaran.findMany({
    where: { sekolahId, tipe },
    orderBy: { batchKe: 'desc' },
  })
  if (semua.length === 0) return null

  const prioritas: Pembayaran['statusPembayaran'][] = ['BELUM_BAYAR', 'DITOLAK', 'MENUNGGU_KONFIRMASI', 'LUNAS']
  for (const status of prioritas) {
    const match = semua.find((p) => p.statusPembayaran === status)
    if (match) return match
  }
  return semua[0]
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tipe: string }> }
) {
  try {
    const rl = checkRateLimit(req, { key: 'pembayaran-peserta', max: 60, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const { id, tipe: tipeParam } = await params
    const tipe = parseTipe(tipeParam)
    const pembayaranId = req.nextUrl.searchParams.get('pembayaranId')

    if (!tipe) {
      return NextResponse.json({ success: false, message: 'Tipe pembayaran tidak valid' }, { status: 400 })
    }
    if (tipe === 'TENDA' && !(await hasTendaSession(req.cookies.get(TENDA_SESSION_COOKIE)?.value, id))) return NextResponse.json({ success: false, message: 'Verifikasi sekolah diperlukan untuk melihat pembayaran tenda' }, { status: 401 })

    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      include: {
        peserta: { select: { tipe: true, batchKe: true } },
        tendaSewa: { include: { tendaJenis: { select: { nama: true } } } },
      },
    })

    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }

    const pembayaran = await findRelevantPembayaran(id, tipe, pembayaranId)

    if (!pembayaran) {
      return NextResponse.json(
        { success: false, message: 'Belum ada tagihan untuk tipe pembayaran ini' },
        { status: 404 }
      )
    }

    // Untuk tipe PESERTA, jumlah peserta/pendamping yang ditampilkan HANYA
    // dari batch pembayaran ini (bukan total semua batch sekolah) — supaya
    // rincian biaya yang tampil cocok dengan jumlahBiaya batch tersebut.
    const jumlahPeserta = sekolah.peserta.filter(
      (p) => p.tipe === 'PESERTA' && p.batchKe === pembayaran.batchKe
    ).length
    const jumlahPendamping = sekolah.peserta.filter(
      (p) => p.tipe === 'PENDAMPING' && p.batchKe === pembayaran.batchKe
    ).length

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
        batchKe: pembayaran.batchKe,
        namaLengkap: sekolah.namaLengkap,
        kodePendaftaran: sekolah.kodePendaftaran,
        jumlahBiaya: pembayaran.jumlahBiaya,
        statusPembayaran: pembayaran.statusPembayaran,
        buktiTransferUrl: pembayaran.buktiTransferUrl,
        catatanAdmin: pembayaran.catatanAdmin,
        dibayarPada: pembayaran.dibayarPada,
        dikonfirmasiPada: pembayaran.dikonfirmasiPada,
        kwitansiUrl: pembayaran.kwitansiUrl,
        suratPernyataanUrl: sekolah.suratPernyataanUrl,
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
    const rl = checkRateLimit(req, { key: 'pembayaran-upload', max: 15, windowMs: 60 * 60 * 1000 })
    if (rl) return rl

    const { id, tipe: tipeParam } = await params
    const tipe = parseTipe(tipeParam)
    const pembayaranId = req.nextUrl.searchParams.get('pembayaranId')

    if (!tipe) {
      return NextResponse.json({ success: false, message: 'Tipe pembayaran tidak valid' }, { status: 400 })
    }
    if (tipe === 'TENDA' && !(await hasTendaSession(req.cookies.get(TENDA_SESSION_COOKIE)?.value, id))) return NextResponse.json({ success: false, message: 'Verifikasi sekolah diperlukan untuk mengirim pembayaran tenda' }, { status: 401 })

    // Upload bukti PESERTA wajib punya sesi pembayaran (diberikan saat
    // pendaftaran/susulan sukses). Siapa pun yang hanya memegang link status
    // tidak bisa mengirim bukti atas nama sekolah lain.
    if (tipe === 'PESERTA') {
      const paymentSession = req.cookies.get(PAYMENT_SESSION_COOKIE)?.value
      const tendaSession = req.cookies.get(TENDA_SESSION_COOKIE)?.value
      const punyaSesi = (await hasPaymentSession(paymentSession, id)) || (await hasTendaSession(tendaSession, id))
      if (!punyaSesi) {
        return NextResponse.json(
          { success: false, message: 'Sesi pembayaran tidak valid atau sudah berakhir. Silakan ulangi pendaftaran atau minta tautan baru ke panitia.' },
          { status: 401 }
        )
      }
    }

    const pembayaran = await findRelevantPembayaran(id, tipe, pembayaranId)

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

    const sekolahFull = await prisma.sekolah.findUniqueOrThrow({
      where: { id },
      include: {
        peserta: { select: { tipe: true, batchKe: true } },
        tendaSewa: { include: { tendaJenis: { select: { nama: true } } } },
      },
    })

    const qrToken = pembayaran.qrToken ?? nanoid(24)
    let kwitansiUrl: string | null = pembayaran.kwitansiUrl

    try {
      const qrFilename = `kwitansi-${nanoid(10)}.png`
      const verifikasiUrl = `${getBaseUrl()}/kwitansi/verifikasi/${qrToken}`
      const qrCodeUrl = await generateQrCode(verifikasiUrl, qrFilename)
      const qrCodeBuffer = await readFile(getAbsolutePathFromUrl(qrCodeUrl))

      let items: KwitansiLineItem[]
      if (tipe === 'PESERTA') {
        const jp = sekolahFull.peserta.filter(
          (p) => p.tipe === 'PESERTA' && p.batchKe === pembayaran.batchKe
        ).length
        const jd = sekolahFull.peserta.filter(
          (p) => p.tipe === 'PENDAMPING' && p.batchKe === pembayaran.batchKe
        ).length
        const { BIAYA_PESERTA, BIAYA_PENDAMPING } = await import('@/lib/constants-sekolah')
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

      const batchSuffix = pembayaran.batchKe > 1 ? `-B${pembayaran.batchKe}` : ''
      const nomorKwitansi = `KW-${sanitizeFilename(sekolahFull.kodePendaftaran)}-${tipe}${batchSuffix}`
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
      console.error('[POST pembayaran] Gagal generate kwitansi:', kwitansiError)
    }

    let updated: Pembayaran
    try {
      updated = await prisma.$transaction(async (tx) => {
        const pembayaranTerbaru = await tx.pembayaran.findUnique({ where: { id: pembayaran.id } })
        if (!pembayaranTerbaru || !['BELUM_BAYAR', 'DITOLAK'].includes(pembayaranTerbaru.statusPembayaran)) {
          throw new Error('PEMBAYARAN_SUDAH_DIPROSES')
        }

        if (tipe === 'TENDA') {
          const pilihanTenda = sekolahFull.tendaSewa.map((tenda) => ({
            tendaJenisId: tenda.tendaJenisId,
            jumlah: tenda.jumlah,
          }))
          if (pilihanTenda.length === 0) throw new Error('PILIHAN_TENDA_KOSONG')
          await lockDanValidasiStokTenda(tx, id, pilihanTenda)
        }

        return tx.pembayaran.update({
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
      })
    } catch (updateError) {
      if (updateError instanceof Error && updateError.message.startsWith('STOK_HABIS:')) {
        const [, nama, sisa] = updateError.message.split(':')
        return NextResponse.json(
          { success: false, message: `Stok "${nama}" kini tersisa ${sisa} unit. Silakan pilih ulang tenda.` },
          { status: 409 }
        )
      }
      if (updateError instanceof Error && updateError.message === 'PILIHAN_TENDA_KOSONG') {
        return NextResponse.json({ success: false, message: 'Pilihan tenda tidak ditemukan.' }, { status: 409 })
      }
      if (updateError instanceof Error && updateError.message === 'PEMBAYARAN_SUDAH_DIPROSES') {
        return NextResponse.json({ success: false, message: 'Pembayaran sudah diproses.' }, { status: 409 })
      }
      throw updateError
    }

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
