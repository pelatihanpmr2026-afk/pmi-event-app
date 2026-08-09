import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { readFile } from 'fs/promises'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { dataSekolahSchema } from '@/lib/validations/sekolah'
import { pesertaMetaArraySchema, pendampingArraySchema } from '@/lib/validations/peserta'
import { normalizeNamaSekolah, deriveKategori, generateKodePendaftaran, sanitizeFilename } from '@/lib/sekolah'
import { saveBuffer, saveUploadedFile, getFileExtension, getAbsolutePathFromUrl } from '@/lib/save-file'
import { generateExcelSekolah } from '@/lib/generate-excel-sekolah'
import { generateQrCode } from '@/lib/generate-qrcode'
import { generateKwitansi, type KwitansiLineItem } from '@/lib/generate-kwitansi'
import { BIAYA_PESERTA, BIAYA_PENDAMPING, ACCEPTED_BUKTI_TYPES, MAX_BUKTI_SIZE } from '@/lib/constants-sekolah'
import type { Jenjang, StatusSekolah } from '@prisma/client'


const MAX_RETRY_KODE = 5

export async function POST(req: NextRequest) {
  try {
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
    const pesertaList = parsedPeserta.data
    const pendampingList = parsedPendamping.data

    // Bukti transfer sekarang WAJIB — bagian dari submit final
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
          { success: false, message: `Foto untuk peserta #${i + 1} tidak ditemukan` },
          { status: 400 }
        )
      }
      fotoFiles.push(foto)
    }

    const namaLengkap = normalizeNamaSekolah(
      dataSekolah.jenjang as Jenjang,
      dataSekolah.statusSekolah as StatusSekolah,
      dataSekolah.namaInput
    )
    const kategori = deriveKategori(dataSekolah.jenjang as Jenjang)

    const existingSekolah = await prisma.sekolah.findUnique({
      where: { namaLengkap },
      include: { peserta: { select: { id: true } } },
    })

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
    const pesertaFotoData: { url: string; buffer: Buffer }[] = []
    for (let i = 0; i < fotoFiles.length; i++) {
      const file = fotoFiles[i]
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = getFileExtension(file.name)
      const filename = `${uid}-${i}${ext}`
      const url = await saveBuffer(buffer, 'peserta-photos', filename)
      pesertaFotoData.push({ url, buffer })
    }

    const biayaPeserta = pesertaList.length * BIAYA_PESERTA
    const biayaPendamping = pendampingList.length * BIAYA_PENDAMPING
    const totalBiaya = biayaPeserta + biayaPendamping

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
                data: { namaPembina: dataSekolah.namaPembina, noWhatsappPembina: dataSekolah.noWhatsappPembina },
              })
            : await tx.sekolah.create({
                data: {
                  jenjang: dataSekolah.jenjang as Jenjang,
                  statusSekolah: dataSekolah.statusSekolah as StatusSekolah,
                  namaInput: dataSekolah.namaInput,
                  namaLengkap,
                  kategori,
                  nomorPendaftaran: kodeInfo.nomorPendaftaran,
                  tahunPendaftaran: kodeInfo.tahunPendaftaran,
                  kodePendaftaran: kodeInfo.kodePendaftaran,
                  namaPembina: dataSekolah.namaPembina,
                  noWhatsappPembina: dataSekolah.noWhatsappPembina,
                },
              })

          await tx.peserta.createMany({
            data: [
              ...pesertaList.map((p, i) => ({
                sekolahId: sekolah.id,
                tipe: 'PESERTA' as const,
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
                sekolahId: sekolah.id,
                tipe: 'PENDAMPING' as const,
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

          return tx.sekolah.findUniqueOrThrow({ where: { id: sekolah.id }, include: { peserta: true } })
        })
        break
      } catch (error) {
        lastError = error
        if (
          !existingSekolah &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          (error.meta?.target as string[])?.includes('kodePendaftaran')
        ) {
          continue
        }
        throw error
      }
    }

    if (!createdSekolah) {
      console.error('[POST /api/sekolah] Gagal generate kode pendaftaran unik:', lastError)
      return NextResponse.json({ success: false, message: 'Gagal memproses pendaftaran, silakan coba lagi.' }, { status: 500 })
    }

    // Simpan bukti transfer + generate kwitansi + buat record Pembayaran (langsung MENUNGGU_KONFIRMASI)
    const buktiExt = getFileExtension(buktiFile.name)
    const buktiFilename = `${uid}${buktiExt}`
    const buktiTransferUrl = await saveUploadedFile(buktiFile, 'bukti-transfer', buktiFilename)
    const dibayarPada = new Date()

    const qrToken = nanoid(24)
    let kwitansiUrl: string | null = null

    try {
      const qrFilename = `kwitansi-${nanoid(10)}.png`
      const qrCodeUrl = await generateQrCode(qrToken, qrFilename)
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
    } catch (kwitansiError) {
      console.error('[POST /api/sekolah] Gagal generate kwitansi:', kwitansiError)
    }

    await prisma.pembayaran.upsert({
      where: { sekolahId_tipe: { sekolahId: createdSekolah.id, tipe: 'PESERTA' } },
      create: {
        sekolahId: createdSekolah.id,
        tipe: 'PESERTA',
        jumlahBiaya: totalBiaya,
        statusPembayaran: 'MENUNGGU_KONFIRMASI',
        buktiTransferUrl,
        dibayarPada,
        qrToken,
        kwitansiUrl,
      },
      update: {
        jumlahBiaya: totalBiaya,
        statusPembayaran: 'MENUNGGU_KONFIRMASI',
        buktiTransferUrl,
        dibayarPada,
        qrToken,
        kwitansiUrl,
      },
    })

    try {
      const excelFilename = `${sanitizeFilename(createdSekolah.kodePendaftaran)}.xlsx`
      const excelUrl = await generateExcelSekolah({
        namaSekolah: namaLengkap,
        kodePendaftaran: createdSekolah.kodePendaftaran,
        peserta: pesertaList.map((p, i) => ({
          namaLengkap: p.namaLengkap,
          tempatLahir: p.tempatLahir,
          tanggalLahir: new Date(p.tanggalLahir),
          alamat: p.alamat,
          agama: p.agama,
          golonganDarah: p.golonganDarah,
          tahunMasuk: Number(p.tahunMasuk),
          noHp: p.noHp,
          gender: p.gender,
          fotoBuffer: pesertaFotoData[i].buffer,
        })),
        pendamping: pendampingList.map((p) => ({
          namaLengkap: p.namaLengkap,
          tempatLahir: p.tempatLahir,
          tanggalLahir: new Date(p.tanggalLahir),
          alamat: p.alamat,
          agama: p.agama,
          golonganDarah: p.golonganDarah,
          tahunMasuk: Number(p.tahunMasuk),
          noHp: p.noHp,
          gender: p.gender,
        })),
        filename: excelFilename,
      })
      await prisma.sekolah.update({ where: { id: createdSekolah.id }, data: { excelUrl } })
    } catch (excelError) {
      console.error('[POST /api/sekolah] Gagal generate Excel:', excelError)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Pendaftaran & bukti transfer berhasil dikirim',
        data: { sekolahId: createdSekolah.id, kodePendaftaran: createdSekolah.kodePendaftaran },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/sekolah]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}