import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { susulanPayloadSchema } from '@/lib/validations/susulan'
import { saveBuffer, saveUploadedFile, getFileExtension, getAbsolutePathFromUrl, deleteFileByUrl } from '@/lib/save-file'
import { normalizeParticipantPhotoBuffer } from '@/lib/normalize-image-buffer'
import { generateQrCode } from '@/lib/generate-qrcode'
import { generateKwitansi, type KwitansiLineItem } from '@/lib/generate-kwitansi'
import { BIAYA_PESERTA, BIAYA_PENDAMPING, ACCEPTED_BUKTI_TYPES, MAX_BUKTI_SIZE } from '@/lib/constants-sekolah'
import { sanitizeFilename } from '@/lib/sekolah'
import { SUSULAN_SESSION_COOKIE, verifySusulanSessionToken } from '@/lib/susulan-session'
import { createPaymentSessionToken, PAYMENT_SESSION_COOKIE, PAYMENT_SESSION_MAX_AGE } from '@/lib/payment-session'

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

async function isAuthorizedForSusulan(req: NextRequest, sekolahId: string): Promise<boolean> {
  const token = req.cookies.get(SUSULAN_SESSION_COOKIE)?.value
  return Boolean(token && (await verifySusulanSessionToken(token, sekolahId)))
}

/**
 * GET /api/sekolah/[id]/susulan
 * Ringkasan batch yang sudah ada — dipakai di layar review susulan untuk
 * menampilkan "Batch sebelumnya: 12 peserta (LUNAS) → Susulan ini: +3 peserta".
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!(await isAuthorizedForSusulan(req, id))) {
      return NextResponse.json(
        { success: false, message: 'Sesi verifikasi susulan tidak valid atau sudah berakhir. Silakan verifikasi ulang.' },
        { status: 401 }
      )
    }
    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      select: {
        id: true,
        namaLengkap: true,
        kodePendaftaran: true,
        kategori: true,
        peserta: { select: { tipe: true, batchKe: true } },
        pembayaran: {
          where: { tipe: 'PESERTA' },
          orderBy: { batchKe: 'asc' },
          select: { batchKe: true, statusPembayaran: true, jumlahBiaya: true },
        },
      },
    })

    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }

    const batchMap = new Map<number, { peserta: number; pendamping: number }>()
    for (const p of sekolah.peserta) {
      const entry = batchMap.get(p.batchKe) ?? { peserta: 0, pendamping: 0 }
      if (p.tipe === 'PESERTA') entry.peserta++
      else entry.pendamping++
      batchMap.set(p.batchKe, entry)
    }

    const riwayatBatch = sekolah.pembayaran.map((pb) => ({
      batchKe: pb.batchKe,
      statusPembayaran: pb.statusPembayaran,
      jumlahBiaya: pb.jumlahBiaya,
      jumlahPeserta: batchMap.get(pb.batchKe)?.peserta ?? 0,
      jumlahPendamping: batchMap.get(pb.batchKe)?.pendamping ?? 0,
    }))

    const batchBerikutnya = (sekolah.pembayaran.at(-1)?.batchKe ?? 0) + 1

    return NextResponse.json({
      success: true,
      data: {
        sekolahId: sekolah.id,
        namaLengkap: sekolah.namaLengkap,
        kodePendaftaran: sekolah.kodePendaftaran,
        kategori: sekolah.kategori,
        riwayatBatch,
        batchBerikutnya,
      },
    })
  } catch (error) {
    console.error('[GET /api/sekolah/:id/susulan]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}

/**
 * POST /api/sekolah/[id]/susulan
 * Submit peserta/pendamping SUSULAN untuk sekolah yang sudah terdaftar.
 *
 * Beda krusial dari POST /api/sekolah (pendaftaran awal):
 * - TIDAK PERNAH membuat Sekolah baru (namaLengkap unique, akan tabrakan).
 * - Peserta baru di-create dengan batchKe = batch terakhir + 1.
 * - Pembayaran baru di-CREATE (bukan upsert) dengan batchKe yang sama —
 *   jadi baris pembayaran batch sebelumnya (histori bukti transfer,
 *   kwitansi, tanggal bayar) tidak pernah tertimpa.
 * - No Peserta TIDAK di-generate di sini. Baru digenerate otomatis saat
 *   admin konfirmasi LUNAS lewat assignNoPesertaForSekolah, yang sudah
 *   menghitung "max" secara live dari SEMUA peserta lintas sekolah & batch
 *   — jadi otomatis lanjut dari nomor yang benar-benar tersedia.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!(await isAuthorizedForSusulan(req, id))) {
      return NextResponse.json(
        { success: false, message: 'Sesi verifikasi susulan tidak valid atau sudah berakhir. Silakan verifikasi ulang.' },
        { status: 401 }
      )
    }

    const sekolah = await prisma.sekolah.findUnique({ where: { id } })
    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }

    const formData = await req.formData()

    const rawPeserta = formData.get('peserta')?.toString()
    const rawPendamping = formData.get('pendamping')?.toString()
    if (!rawPeserta || !rawPendamping) {
      return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 })
    }

    const parsed = susulanPayloadSchema.safeParse({
      peserta: JSON.parse(rawPeserta),
      pendamping: JSON.parse(rawPendamping),
    })
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data peserta/pendamping susulan tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { peserta: pesertaList, pendamping: pendampingList } = parsed.data

    const buktiFile = formData.get('buktiTransfer') as File | null
    if (!buktiFile || !(buktiFile instanceof File) || buktiFile.size === 0) {
      return NextResponse.json({ success: false, message: 'Bukti transfer wajib diupload' }, { status: 400 })
    }
    if (buktiFile.size > MAX_BUKTI_SIZE) {
      return NextResponse.json({ success: false, message: 'Ukuran bukti transfer maksimal 5MB' }, { status: 400 })
    }
    if (!ACCEPTED_BUKTI_TYPES.includes(buktiFile.type)) {
      return NextResponse.json(
        { success: false, message: 'Format bukti transfer harus JPG, PNG, atau PDF' },
        { status: 400 }
      )
    }

    const fotoFiles: File[] = []
    for (let i = 0; i < pesertaList.length; i++) {
      const foto = formData.get(`foto_${i}`) as File | null
      if (!foto || !(foto instanceof File) || foto.size === 0) {
        return NextResponse.json(
          { success: false, message: `Foto untuk peserta susulan #${i + 1} tidak ditemukan` },
          { status: 400 }
        )
      }
      fotoFiles.push(foto)
    }

    // Tentukan batch berikutnya berdasarkan histori Pembayaran PESERTA
    // sekolah ini — BUKAN dihitung dari jumlah peserta, karena batch bisa
    // saja hanya berisi pendamping.
    const lastBatch = await prisma.pembayaran.findFirst({
      where: { sekolahId: id, tipe: 'PESERTA' },
      orderBy: { batchKe: 'desc' },
      select: { batchKe: true },
    })
    const batchKe = (lastBatch?.batchKe ?? 0) + 1

    const uid = nanoid(10)
    const savedFiles: string[] = []

    const cleanupFiles = async () => {
      await Promise.all(savedFiles.map((url) => deleteFileByUrl(url)))
    }

    // ===== 1) Simpan SEMUA file dulu, SEBELUM menyentuh database =====
    // Foto peserta & bukti transfer disimpan lebih dulu; kalau ada yang gagal,
    // user langsung melihat error dan TIDAK ada peserta/pembayaran yang
    // tercatat di DB (file yang sudah tersimpan dibersihkan).
    const pesertaFotoData: { url: string; buffer: Buffer }[] = []
    let buktiTransferUrl: string | null = null
    try {
      for (let i = 0; i < fotoFiles.length; i++) {
        const file = fotoFiles[i]
        let buffer: Buffer
        try {
          buffer = await normalizeParticipantPhotoBuffer(Buffer.from(await file.arrayBuffer()))
        } catch {
          await cleanupFiles()
          return NextResponse.json(
            { success: false, message: `Foto peserta susulan ke-${i + 1} tidak valid. Gunakan JPG atau PNG yang tidak rusak.` },
            { status: 400 }
          )
        }
        const filename = `${uid}-susulan${batchKe}-${i}.jpg`
        const url = await saveBuffer(buffer, 'peserta-photos', filename)
        pesertaFotoData.push({ url, buffer })
        savedFiles.push(url)
      }

      const buktiExt = getFileExtension(buktiFile.name)
      const buktiFilename = `${uid}-susulan${batchKe}${buktiExt}`
      buktiTransferUrl = await saveUploadedFile(buktiFile, 'bukti-transfer', buktiFilename)
      savedFiles.push(buktiTransferUrl)
    } catch (fileError) {
      await cleanupFiles()
      const message =
        fileError instanceof Error && fileError.message.includes('Isi file')
          ? 'File bukti transfer tidak cocok dengan ekstensinya (contoh: isi JPEG tapi nama file .png). Upload file asli tanpa mengubah ekstensi.'
          : fileError instanceof Error
            ? fileError.message
            : 'Gagal menyimpan file. Silakan coba lagi.'
      return NextResponse.json({ success: false, message }, { status: 400 })
    }

    const dibayarPada = new Date()
    const qrToken = nanoid(24)
    const biayaPeserta = pesertaList.length * BIAYA_PESERTA
    const biayaPendamping = pendampingList.length * BIAYA_PENDAMPING
    const totalBiaya = biayaPeserta + biayaPendamping

    // ===== 2) Satu transaksi: Peserta + Pembayaran =====
    // create-only (BUKAN upsert) — inilah yang menjamin batch sebelumnya
    // tidak pernah tertimpa, ditambah unique key [sekolahId, tipe, batchKe]
    // di schema yang menjaga tidak ada 2 baris Pembayaran untuk batch yang sama.
    const pembayaranBaru = await prisma.$transaction(async (tx) => {
      await tx.peserta.createMany({
        data: [
          ...pesertaList.map((p, i) => ({
            sekolahId: id,
            tipe: 'PESERTA' as const,
            batchKe,
            namaLengkap: p.namaLengkap,
            tempatLahir: p.tempatLahir,
            tanggalLahir: new Date(p.tanggalLahir),
            alamat: p.alamat,
            agama: p.agama,
            golonganDarah: p.golonganDarah,
            tahunMasuk: Number(p.tahunMasuk),
            noHp: p.noHp || null,
            gender: p.gender,
            riwayatPenyakit: p.riwayatPenyakit,
            fotoUrl: pesertaFotoData[i].url,
          })),
          ...pendampingList.map((p) => ({
            sekolahId: id,
            tipe: 'PENDAMPING' as const,
            batchKe,
            namaLengkap: p.namaLengkap,
            tempatLahir: p.tempatLahir,
            tanggalLahir: new Date(p.tanggalLahir),
            alamat: p.alamat,
            agama: p.agama,
            golonganDarah: p.golonganDarah,
            tahunMasuk: Number(p.tahunMasuk),
            noHp: p.noHp || null,
            gender: p.gender,
            fotoUrl: null,
          })),
        ],
      })

      return tx.pembayaran.create({
        data: {
          sekolahId: id,
          tipe: 'PESERTA',
          batchKe,
          jumlahBiaya: totalBiaya,
          statusPembayaran: 'MENUNGGU_KONFIRMASI',
          buktiTransferUrl,
          dibayarPada,
          qrToken,
          kwitansiUrl: null,
        },
      })
    })

    // ===== 3) Kwitansi dibuat SETELAH transaksi sukses (non-blokir) =====
    let kwitansiUrl: string | null = null

    try {
      const qrFilename = `kwitansi-${nanoid(10)}.png`
      const verifikasiUrl = `${getBaseUrl()}/kwitansi/verifikasi/${qrToken}`
      const qrCodeUrl = await generateQrCode(verifikasiUrl, qrFilename)
      const qrCodeBuffer = await readFile(getAbsolutePathFromUrl(qrCodeUrl))

      const items: KwitansiLineItem[] = [
        { label: 'Peserta (Susulan)', qty: pesertaList.length, hargaSatuan: BIAYA_PESERTA, subtotal: biayaPeserta },
        {
          label: 'Pendamping (Susulan)',
          qty: pendampingList.length,
          hargaSatuan: BIAYA_PENDAMPING,
          subtotal: biayaPendamping,
        },
      ].filter((item) => item.qty > 0)

      const nomorKwitansi = `KW-${sanitizeFilename(sekolah.kodePendaftaran)}-PESERTA-B${batchKe}`
      kwitansiUrl = await generateKwitansi({
        nomorKwitansi,
        tipe: 'PESERTA',
        namaSekolah: sekolah.namaLengkap,
        namaPembina: sekolah.namaPembina,
        kodePendaftaran: sekolah.kodePendaftaran,
        tanggalBayar: dibayarPada,
        items,
        total: totalBiaya,
        qrCodeBuffer,
        filename: `${sanitizeFilename(nomorKwitansi)}.pdf`,
      })

      if (kwitansiUrl) {
        await prisma.pembayaran.update({
          where: { id: pembayaranBaru.id },
          data: { kwitansiUrl },
        })
      }
    } catch (kwitansiError) {
      console.error('[POST /api/sekolah/:id/susulan] Gagal generate kwitansi:', kwitansiError)
    }

    const response = NextResponse.json(
      {
        success: true,
        message: `Pendaftaran susulan (batch ${batchKe}) & bukti transfer berhasil dikirim`,
        data: { sekolahId: id, pembayaranId: pembayaranBaru.id, batchKe },
      },
      { status: 201 }
    )

    // Sesi pembayaran peserta (30 hari) untuk melindungi upload bukti.
    const paymentToken = await createPaymentSessionToken(id)
    response.cookies.set(PAYMENT_SESSION_COOKIE, paymentToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: PAYMENT_SESSION_MAX_AGE,
      path: `/api/sekolah/${id}`,
    })

    return response
  } catch (error) {
    console.error('[POST /api/sekolah/:id/susulan]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
