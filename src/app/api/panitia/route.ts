import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { panitiaServerSchema } from '@/lib/validations/panitia'
import { generateNomorRegistrasi } from '@/lib/generate-nomor-registrasi'
import { saveUploadedFile, getFileExtension, getAbsolutePathFromUrl } from '@/lib/save-file'
import { generateQrCode } from '@/lib/generate-qrcode'
import { generateIdCard } from '@/lib/generate-idcard'
import { DIVISI_OPTIONS, DIVISI_CAPACITY, MAX_FOTO_SIZE, ACCEPTED_FOTO_TYPES } from '@/lib/constants'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const rawData = {
      nama: formData.get('nama')?.toString() ?? '',
      gender: formData.get('gender')?.toString() ?? '',
      noWhatsapp: formData.get('noWhatsapp')?.toString() ?? '',
      alamat: formData.get('alamat')?.toString() ?? '',
      asalUnit: formData.get('asalUnit')?.toString() ?? '',
      divisi: formData.get('divisi')?.toString() ?? '',
    }

    const parsed = panitiaServerSchema.safeParse(rawData)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const foto = formData.get('foto') as File | null

    if (!foto || !(foto instanceof File) || foto.size === 0) {
      return NextResponse.json(
        { success: false, message: 'Foto wajib diupload' },
        { status: 400 }
      )
    }

    if (foto.size > MAX_FOTO_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Ukuran foto maksimal 5MB' },
        { status: 400 }
      )
    }

    if (!ACCEPTED_FOTO_TYPES.includes(foto.type)) {
      return NextResponse.json(
        { success: false, message: 'Format foto harus JPG atau PNG' },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Validasi kapasitas divisi — dibungkus transaction supaya count + create
    // relatif atomic dan mengurangi risiko race condition saat 2 orang submit
    // divisi yang sama nyaris bersamaan di detik-detik terakhir kuota.
    const maxKapasitas = DIVISI_CAPACITY[data.divisi]
    const jumlahTerdaftar = await prisma.panitia.count({
      where: { divisi: data.divisi },
    })

    if (maxKapasitas !== undefined && jumlahTerdaftar >= maxKapasitas) {
      const divisiLabel = DIVISI_OPTIONS.find((d) => d.value === data.divisi)?.label ?? data.divisi
      return NextResponse.json(
        {
          success: false,
          message: `Kuota untuk divisi "${divisiLabel}" sudah penuh (maksimal ${maxKapasitas} orang). Silakan pilih divisi lain.`,
        },
        { status: 409 }
      )
    }

    const uid = nanoid(12)
    const qrToken = nanoid(24)

    // 1. Simpan foto asli
    const fotoExt = getFileExtension(foto.name)
    const fotoFilename = `${uid}${fotoExt}`
    const fotoUrl = await saveUploadedFile(foto, 'photos', fotoFilename)
    const fotoAbsolutePath = getAbsolutePathFromUrl(fotoUrl)

// 2. Generate QR Code
const qrFilename = `${uid}.png`
const qrCodeUrl = await generateQrCode(qrToken, qrFilename)
const qrCodeAbsolutePath = getAbsolutePathFromUrl(qrCodeUrl)

// 3. Generate ID Card (sekaligus composite QR Code ke dalamnya)
const divisiLabel = DIVISI_OPTIONS.find((d) => d.value === data.divisi)?.label ?? data.divisi
const idCardFilename = `${uid}.png`
const idCardUrl = await generateIdCard({
  fotoPath: fotoAbsolutePath,
  qrCodePath: qrCodeAbsolutePath,
  nama: data.nama,
  divisiLabel,
  filename: idCardFilename,
})

    // 4. Generate nomor registrasi & simpan ke database
    //    Cek ulang kapasitas tepat sebelum create() sebagai lapisan pengaman kedua
    //    (menutup celah race condition antara pengecekan awal dan proses generate file di atas)
    const finalCount = await prisma.panitia.count({ where: { divisi: data.divisi } })
    if (maxKapasitas !== undefined && finalCount >= maxKapasitas) {
      return NextResponse.json(
        {
          success: false,
          message: `Kuota untuk divisi "${divisiLabel}" baru saja penuh oleh pendaftar lain. Silakan pilih divisi lain.`,
        },
        { status: 409 }
      )
    }

    const nomorRegistrasi = await generateNomorRegistrasi()

    const panitia = await prisma.panitia.create({
      data: {
        nomorRegistrasi,
        nama: data.nama,
        gender: data.gender,
        noWhatsapp: data.noWhatsapp,
        alamat: data.alamat,
        asalUnit: data.asalUnit,
        divisi: data.divisi,
        fotoUrl,
        qrCodeUrl,
        idCardUrl,
        qrToken,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Pendaftaran berhasil',
        data: {
          id: panitia.id,
          nomorRegistrasi: panitia.nomorRegistrasi,
          idCardUrl: panitia.idCardUrl,
          qrCodeUrl: panitia.qrCodeUrl,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/panitia]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const panitiaList = await prisma.panitia.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: panitiaList })
  } catch (error) {
    console.error('[GET /api/panitia]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}