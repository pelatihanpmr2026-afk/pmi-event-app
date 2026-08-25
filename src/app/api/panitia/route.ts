import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { panitiaServerSchema } from '@/lib/validations/panitia'
import { generateNomorRegistrasi } from '@/lib/generate-nomor-registrasi'
import { saveUploadedFile, getFileExtension, getAbsolutePathFromUrl } from '@/lib/save-file'
import { generateQrCode } from '@/lib/generate-qrcode'
import { generateIdCard } from '@/lib/generate-idcard'
import { DIVISI_OPTIONS, DIVISI_CAPACITY, MAX_FOTO_SIZE, ACCEPTED_FOTO_TYPES } from '@/lib/constants'
import { requireRole } from '@/lib/api-guard'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_RETRY_NOMOR = 3

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'panitia-register', max: 30, windowMs: 60 * 60 * 1000 })
    if (rl) return rl

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

    // 4. Simpan ke database. Kapasitas + create dibuat ATOMIC dengan MySQL
    //    advisory lock per divisi (GET_LOCK) — dua pendaftar divisi sama yang
    //    submit bersamaan tidak bisa sama-sama lolos cek kuota (race condition).
    const lockName = `panitia-${data.divisi}`
    await prisma.$queryRaw`SELECT GET_LOCK(${lockName}, 5)`

    try {
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

      // nomorRegistrasi & qrToken unik di DB — retry dengan nomor baru saat
      // terjadi tabrakan (P2002).
      let panitia: Awaited<ReturnType<typeof prisma.panitia.create>> | null = null
      let lastCreateError: unknown = null

      for (let attempt = 0; attempt < MAX_RETRY_NOMOR; attempt++) {
        try {
          const nomorRegistrasi = await generateNomorRegistrasi()
          panitia = await prisma.panitia.create({
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
          break
        } catch (error) {
          lastCreateError = error
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            continue
          }
          throw error
        }
      }

      if (!panitia) {
        console.error('[POST /api/panitia] Gagal generate nomor registrasi unik:', lastCreateError)
        return NextResponse.json(
          { success: false, message: 'Pendaftaran gagal, silakan coba lagi.' },
          { status: 500 }
        )
      }

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
    } finally {
      await prisma.$queryRaw`SELECT RELEASE_LOCK(${lockName})`
    }
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
    // Daftar panitia berisi qrToken (kredensial absensi) dan data pribadi —
    // tidak boleh publik. Hanya untuk admin kesekretariatan.
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

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