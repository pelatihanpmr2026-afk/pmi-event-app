import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { readFile } from 'fs/promises'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { dataSekolahSchema } from '@/lib/validations/sekolah'
import { pesertaMetaArraySchema, pendampingArraySchema, normalizeNamaPeserta } from '@/lib/validations/peserta'
import { normalizeNamaSekolah, namaSekolahKey, generateKodePendaftaran, sanitizeFilename } from '@/lib/sekolah'
import { saveBuffer, saveUploadedFile, getFileExtension, getAbsolutePathFromUrl, deleteFileByUrl } from '@/lib/save-file'
import { normalizeParticipantPhotoBuffer } from '@/lib/normalize-image-buffer'
import { generateQrCode } from '@/lib/generate-qrcode'
import { generateKwitansi, type KwitansiLineItem } from '@/lib/generate-kwitansi'
import { generateSuratPernyataan } from '@/lib/generate-surat-pernyataan'
import { BIAYA_PESERTA, BIAYA_PENDAMPING, ACCEPTED_BUKTI_TYPES, MAX_BUKTI_SIZE } from '@/lib/constants-sekolah'
import { createPaymentSessionToken, PAYMENT_SESSION_COOKIE, PAYMENT_SESSION_MAX_AGE } from '@/lib/payment-session'
import type { Jenjang, StatusSekolah } from '@prisma/client'
import { TNC_VERSION } from '@/lib/tnc-content'

const MAX_RETRY_KODE = 5

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'sekolah-register', max: 15, windowMs: 60 * 60 * 1000 })
    if (rl) return rl

    const formData = await req.formData()

    const rawSekolahParsed = JSON.parse(formData.get('dataSekolah')?.toString() ?? '{}')
    const existingSekolahId: string | undefined = rawSekolahParsed.existingSekolahId

    const parsedSekolah = dataSekolahSchema.safeParse(rawSekolahParsed)
    if (!parsedSekolah.success) {
      return NextResponse.json(
        { success: false, message: 'Data sekolah tidak valid', errors: parsedSekolah.error.flatten() },
        { status: 400 }
      )
    }

    const rawPeserta = formData.get('peserta')?.toString()
    const rawPendamping = formData.get('pendamping')?.toString()
    if (!rawPeserta || !rawPendamping) {
      return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 })
    }

    const parsedPeserta = pesertaMetaArraySchema.safeParse(JSON.parse(rawPeserta))
    if (!parsedPeserta.success) {
      return NextResponse.json(
        { success: false, message: 'Data peserta tidak valid', errors: parsedPeserta.error.flatten() },
        { status: 400 }
      )
    }
    const parsedPendamping = pendampingArraySchema.safeParse(JSON.parse(rawPendamping))
    if (!parsedPendamping.success) {
      return NextResponse.json(
        { success: false, message: 'Data pendamping tidak valid', errors: parsedPendamping.error.flatten() },
        { status: 400 }
      )
    }

    const dataSekolah = parsedSekolah.data
    if (formData.get('termsVersion') !== TNC_VERSION) return NextResponse.json({ success: false, message: 'Persetujuan syarat dan ketentuan wajib diperbarui' }, { status: 400 })
    // Prisma Client di development bisa masih berasal dari schema sebelum migrasi.
    // Assertion ini tetap aman karena migrasi yang menyertai perubahan menambah kedua kolom.
    const termsConsent = { termsVersion: TNC_VERSION, termsAgreedAt: new Date() } as object
    const pesertaList = parsedPeserta.data
    const pendampingList = parsedPendamping.data

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

    const tandaTanganFile = formData.get('tandaTanganPenanggungJawab') as File | null
    if (tandaTanganFile && (!(tandaTanganFile instanceof File) || tandaTanganFile.size === 0)) {
      return NextResponse.json({ success: false, message: 'File tanda tangan tidak valid' }, { status: 400 })
    }
    if (tandaTanganFile && tandaTanganFile.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'Ukuran tanda tangan maksimal 2MB' }, { status: 400 })
    }
    if (tandaTanganFile && !['image/png', 'image/jpeg'].includes(tandaTanganFile.type)) {
      return NextResponse.json({ success: false, message: 'Format tanda tangan harus PNG atau JPG' }, { status: 400 })
    }

    const fotoFiles: File[] = []
    for (let i = 0; i < pesertaList.length; i++) {
      const foto = formData.get(`foto_${i}`) as File | null
      if (!foto || !(foto instanceof File) || foto.size === 0) {
        return NextResponse.json(
          { success: false, message: `Foto untuk peserta #${i + 1} tidak ditemukan` },
          { status: 400 }
        )
      }
      fotoFiles.push(foto)
    }

    const namaLengkap = normalizeNamaSekolah(dataSekolah.namaSekolah)
    const kategori = dataSekolah.kategori

    const sekolahDenganNama = await prisma.sekolah.findMany({
      include: { peserta: { select: { id: true } } },
    })
    const existingSekolah = sekolahDenganNama.find(
      (sekolah) => namaSekolahKey(sekolah.namaLengkap) === namaSekolahKey(namaLengkap)
    )

    if (existingSekolah && existingSekolah.peserta.length > 0) {
      return NextResponse.json(
        { success: false, message: `"${namaLengkap}" sudah terdaftar. Silakan kembali ke Step 1.` },
        { status: 409 }
      )
    }
    if (existingSekolah && existingSekolah.id !== existingSekolahId) {
      return NextResponse.json(
        { success: false, message: 'Data sekolah tidak sinkron, silakan ulangi dari Step 1.' },
        { status: 409 }
      )
    }

    const uid = nanoid(10)
    const savedFiles: string[] = []

    const cleanupFiles = async () => {
      await Promise.all(savedFiles.map((url) => deleteFileByUrl(url)))
    }

    let tandaTanganPenanggungJawabUrl: string | null = null
    const pesertaFotoData: { url: string }[] = []
    let buktiTransferUrl: string | null = null

    // ===== 1) Simpan SEMUA file dulu, SEBELUM menyentuh database =====
    // Kegagalan apa pun di tahap ini (foto rusak, magic-bytes bukti tidak
    // cocok, disk penuh) membatalkan pendaftaran TANPA menulis data — file
    // yang sudah tersimpan ikut dibersihkan. Dengan begitu tidak pernah ada
    // sekolah/peserta "ghost" yang tercatat padahal di UI user melihat error.
    try {
      if (tandaTanganFile) {
        const ext = getFileExtension(tandaTanganFile.name)
        tandaTanganPenanggungJawabUrl = await saveUploadedFile(
          tandaTanganFile,
          'tanda-tangan',
          `${uid}-ttd-penanggung-jawab${ext}`
        )
        savedFiles.push(tandaTanganPenanggungJawabUrl)
      }

      for (let i = 0; i < fotoFiles.length; i++) {
        const file = fotoFiles[i]
        let buffer: Buffer
        try {
          buffer = await normalizeParticipantPhotoBuffer(Buffer.from(await file.arrayBuffer()))
        } catch {
          await cleanupFiles()
          return NextResponse.json(
            { success: false, message: `Foto peserta ke-${i + 1} tidak valid. Gunakan JPG atau PNG yang tidak rusak.` },
            { status: 400 }
          )
        }
        const filename = `${uid}-${i}.jpg`
        const url = await saveBuffer(buffer, 'peserta-photos', filename)
        pesertaFotoData.push({ url })
        savedFiles.push(url)
      }

      // Bukti transfer disimpan di sini juga — sebelum transaksi DB — sehingga
      // jika file ditolak (mis. nama .png tapi isi JPEG hasil kompresi), user
      // langsung mendapat pesan error dan TIDAK ada data yang masuk DB.
      const buktiExt = getFileExtension(buktiFile.name)
      const buktiFilename = `${uid}${buktiExt}`
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

    // ===== 2) Satu transaksi: Sekolah + Peserta + Pembayaran =====
    // Baris pembayaran (MENUNGGU_KONFIRMASI + buktiTransferUrl) dibuat DALAM
    // transaksi yang sama dengan sekolah & peserta — mustahil ada sekolah yang
    // tersimpan tanpa tagihan.
    let createdSekolah: Prisma.SekolahGetPayload<{ include: { peserta: true } }> | null = null
    let lastError: unknown = null
    const attemptCount = existingSekolah ? 1 : MAX_RETRY_KODE

    for (let attempt = 0; attempt < attemptCount; attempt++) {
      const kodeInfo = existingSekolah
        ? {
            nomorPendaftaran: existingSekolah.nomorPendaftaran,
            tahunPendaftaran: existingSekolah.tahunPendaftaran,
            kodePendaftaran: existingSekolah.kodePendaftaran,
          }
        : await generateKodePendaftaran(namaLengkap, kategori)

      try {
        createdSekolah = await prisma.$transaction(async (tx) => {
          const sekolah = existingSekolah
            ? await tx.sekolah.update({
                where: { id: existingSekolah.id },
                data: {
                  namaPembina: dataSekolah.namaPembina,
                  noWhatsappPembina: dataSekolah.noWhatsappPembina,
                  tandaTanganPenanggungJawabUrl,
                  ...termsConsent,
                },
              })
            : await tx.sekolah.create({
                data: {
                  // Kolom lama dipertahankan untuk kompatibilitas data historis;
                  // pendaftaran baru hanya meminta nama resmi dan kategori.
                  jenjang: 'SMA' as Jenjang,
                  statusSekolah: 'SWASTA' as StatusSekolah,
                  namaInput: namaLengkap,
                  namaLengkap,
                  kategori,
                  nomorPendaftaran: kodeInfo.nomorPendaftaran,
                  tahunPendaftaran: kodeInfo.tahunPendaftaran,
                  kodePendaftaran: kodeInfo.kodePendaftaran,
                  namaPembina: dataSekolah.namaPembina,
                  noWhatsappPembina: dataSekolah.noWhatsappPembina,
                  tandaTanganPenanggungJawabUrl,
                  ...termsConsent,
                },
              })

          await tx.peserta.createMany({
            data: [
              ...pesertaList.map((p, i) => ({
                sekolahId: sekolah.id,
                tipe: 'PESERTA' as const,
                namaLengkap: normalizeNamaPeserta(p.namaLengkap),
                tempatLahir: p.tempatLahir,
                tanggalLahir: new Date(`${p.tanggalLahir}T00:00:00.000Z`),
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
                sekolahId: sekolah.id,
                tipe: 'PENDAMPING' as const,
                namaLengkap: normalizeNamaPeserta(p.namaLengkap),
                tempatLahir: p.tempatLahir,
                tanggalLahir: new Date(`${p.tanggalLahir}T00:00:00.000Z`),
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

          await tx.pembayaran.upsert({
            where: { sekolahId_tipe_batchKe: { sekolahId: sekolah.id, tipe: 'PESERTA', batchKe: 1 } },
            create: {
              sekolahId: sekolah.id,
              tipe: 'PESERTA',
              batchKe: 1,
              jumlahBiaya: totalBiaya,
              statusPembayaran: 'MENUNGGU_KONFIRMASI',
              buktiTransferUrl,
              dibayarPada,
              qrToken,
              kwitansiUrl: null,
            },
            update: {
              batchKe: 1,
              jumlahBiaya: totalBiaya,
              statusPembayaran: 'MENUNGGU_KONFIRMASI',
              buktiTransferUrl,
              dibayarPada,
              qrToken,
            },
          })

          return tx.sekolah.findUniqueOrThrow({ where: { id: sekolah.id }, include: { peserta: true } })
        })
        break
      } catch (error) {
        lastError = error
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = (error.meta?.target as string[]) ?? []
          // Kode pendaftaran duplikat karena 2 request nyaris bersamaan — coba nomor baru.
          if (!existingSekolah && target.includes('kodePendaftaran')) {
            continue
          }
          // Nama sekolah sama terdaftar bersamaan oleh 2 tab (namaLengkap unique di DB).
          if (target.includes('namaLengkap')) {
            await cleanupFiles()
            return NextResponse.json(
              {
                success: false,
                message: `"${namaLengkap}" sudah terdaftar. Silakan kembali ke Step 1.`,
              },
              { status: 409 }
            )
          }
        }
        throw error
      }
    }

    if (!createdSekolah) {
      await cleanupFiles()
      console.error('[POST /api/sekolah] Gagal generate kode pendaftaran unik:', lastError)
      return NextResponse.json({ success: false, message: 'Gagal memproses pendaftaran, silakan coba lagi.' }, { status: 500 })
    }

    // ===== 3) Kwitansi dibuat SETELAH transaksi sukses (non-blokir) =====
    // Gagal generate kwitansi tidak membatalkan pendaftaran yang sudah valid —
    // kwitansiUrl cukup dikosongkan dan bisa dibuat ulang oleh admin.
    let kwitansiUrl: string | null = null

    try {
      const qrFilename = `kwitansi-${nanoid(10)}.png`
      // QR sekarang berisi URL LENGKAP (bukan token polos) — bisa langsung
      // discan & dibuka oleh kamera HP manapun ke halaman verifikasi.
      const verifikasiUrl = `${getBaseUrl()}/kwitansi/verifikasi/${qrToken}`
      const qrCodeUrl = await generateQrCode(verifikasiUrl, qrFilename)
      const qrCodeBuffer = await readFile(getAbsolutePathFromUrl(qrCodeUrl))

      const items: KwitansiLineItem[] = [
        { label: 'Peserta', qty: pesertaList.length, hargaSatuan: BIAYA_PESERTA, subtotal: biayaPeserta },
        { label: 'Pendamping', qty: pendampingList.length, hargaSatuan: BIAYA_PENDAMPING, subtotal: biayaPendamping },
      ].filter((item) => item.qty > 0)

      const nomorKwitansi = `KW-${sanitizeFilename(createdSekolah.kodePendaftaran)}-PESERTA`
      kwitansiUrl = await generateKwitansi({
        nomorKwitansi,
        tipe: 'PESERTA',
        namaSekolah: createdSekolah.namaLengkap,
        namaPembina: createdSekolah.namaPembina,
        kodePendaftaran: createdSekolah.kodePendaftaran,
        tanggalBayar: dibayarPada,
        items,
        total: totalBiaya,
        qrCodeBuffer,
        filename: `${sanitizeFilename(nomorKwitansi)}.pdf`,
      })

      if (kwitansiUrl) {
        await prisma.pembayaran.update({
          where: { sekolahId_tipe_batchKe: { sekolahId: createdSekolah.id, tipe: 'PESERTA', batchKe: 1 } },
          data: { kwitansiUrl },
        })
      }
    } catch (kwitansiError) {
      console.error('[POST /api/sekolah] Gagal generate kwitansi:', kwitansiError)
    }

    // ===== 4) Surat Pernyataan dibuat SETELAH transaksi sukses (non-blokir) =====
    // Sama seperti kwitansi: kegagalan di sini tidak membatalkan pendaftaran.
    // Surat dibuat SEKARANG (bukan menunggu konfirmasi admin) supaya tombol
    // download Surat Pernyataan + Kwitansi langsung muncul di halaman status
    // pembayaran meskipun bukti transfer belum diverifikasi.
    if (createdSekolah.suratPernyataanUrl == null) {
      try {
        let tandaTanganBuffer: Buffer | null = null
        if (tandaTanganPenanggungJawabUrl) {
          try {
            tandaTanganBuffer = await readFile(getAbsolutePathFromUrl(tandaTanganPenanggungJawabUrl))
          } catch (signatureError) {
            console.error('[POST /api/sekolah] Gagal membaca tanda tangan:', signatureError)
          }
        }
        const suratFilename = `${sanitizeFilename(createdSekolah.kodePendaftaran)}.pdf`
        const suratUrl = await generateSuratPernyataan({
          namaSekolah: createdSekolah.namaLengkap,
          kodePendaftaran: createdSekolah.kodePendaftaran,
          namaPembina: createdSekolah.namaPembina,
          tanggal: new Date(),
          filename: suratFilename,
          tandaTanganBuffer,
        })
        await prisma.sekolah.update({
          where: { id: createdSekolah.id },
          data: { suratPernyataanUrl: suratUrl },
        })
      } catch (suratError) {
        console.error('[POST /api/sekolah] Gagal generate Surat Pernyataan:', suratError)
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        message: 'Pendaftaran & bukti transfer berhasil dikirim',
        data: { sekolahId: createdSekolah.id, kodePendaftaran: createdSekolah.kodePendaftaran },
      },
      { status: 201 }
    )

    // Beri sesi pembayaran peserta (30 hari) — dipakai melindungi endpoint
    // upload bukti transfer dari akses pihak yang tidak berhak.
    const paymentToken = await createPaymentSessionToken(createdSekolah.id)
    response.cookies.set(PAYMENT_SESSION_COOKIE, paymentToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: PAYMENT_SESSION_MAX_AGE,
      path: `/api/sekolah/${createdSekolah.id}`,
    })

    return response
  } catch (error) {
    console.error('[POST /api/sekolah]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const panitiaList = await prisma.sekolah.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: panitiaList })
  } catch (error) {
    console.error('[GET /api/sekolah]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
