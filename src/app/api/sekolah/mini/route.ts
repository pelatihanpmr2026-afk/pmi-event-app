import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dataSekolahMiniSchema } from '@/lib/validations/sekolah'
import { normalizeNamaSekolah, deriveKategori, generateKodePendaftaran } from '@/lib/sekolah'
import { Prisma } from '@prisma/client'
import type { Jenjang, StatusSekolah } from '@prisma/client'

const MAX_RETRY_KODE = 5

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = dataSekolahMiniSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const namaLengkap = normalizeNamaSekolah(
      data.jenjang as Jenjang,
      data.statusSekolah as StatusSekolah,
      data.namaInput
    )
    const kategori = deriveKategori(data.jenjang as Jenjang)

    const existing = await prisma.sekolah.findUnique({ where: { namaLengkap } })
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `"${namaLengkap}" sudah terdaftar sebelumnya. Silakan gunakan fitur "Cari Sekolah" untuk melanjutkan sewa tenda ke sekolah tersebut, bukan daftar baru.`,
        },
        { status: 409 }
      )
    }

    let created = null
    let lastError: unknown = null

    for (let attempt = 0; attempt < MAX_RETRY_KODE; attempt++) {
      const { nomorPendaftaran, tahunPendaftaran, kodePendaftaran } = await generateKodePendaftaran(
        namaLengkap,
        kategori
      )

      try {
        created = await prisma.sekolah.create({
          data: {
            jenjang: data.jenjang as Jenjang,
            statusSekolah: data.statusSekolah as StatusSekolah,
            namaInput: data.namaInput,
            namaLengkap,
            kategori,
            nomorPendaftaran,
            tahunPendaftaran,
            kodePendaftaran,
            namaPembina: data.namaPembina,
            noWhatsappPembina: data.noWhatsappPembina,
            estimasiPesertaPendamping: Number(data.estimasiPesertaPendamping),
          },
        })
        break
      } catch (error) {
        lastError = error
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          (error.meta?.target as string[])?.includes('kodePendaftaran')
        ) {
          continue
        }
        throw error
      }
    }

    if (!created) {
      console.error('[POST /api/sekolah/mini] Gagal generate kode unik:', lastError)
      return NextResponse.json(
        { success: false, message: 'Gagal memproses, silakan coba lagi' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/sekolah/mini]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}