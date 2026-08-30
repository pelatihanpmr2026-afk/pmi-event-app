import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { tendaJenisApiSchema } from '@/lib/validations/tenda-jenis'
import { TENDA_RESERVASI_JAM } from '@/lib/constants-sekolah'
import { getSession } from '@/lib/get-session'
import { requireRole } from '@/lib/api-guard'
import { saveUploadedFile } from '@/lib/save-file'

const MAX_TENDA_IMAGE_SIZE = 5 * 1024 * 1024

async function parseTendaRequest(req: NextRequest): Promise<{ data: unknown; gambar: File | null }> {
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    return {
      data: {
        nama: form.get('nama')?.toString() ?? '',
        namaVendor: form.get('namaVendor')?.toString() ?? '',
        noWhatsappVendor: form.get('noWhatsappVendor')?.toString() ?? '',
        kapasitasMin: Number(form.get('kapasitasMin')),
        kapasitasMax: Number(form.get('kapasitasMax')),
        harga: Number(form.get('harga')),
        hargaVendor: Number(form.get('hargaVendor')),
        stokTotal: Number(form.get('stokTotal')),
      },
      gambar: form.get('gambar') instanceof File ? form.get('gambar') as File : null,
    }
  }
  return { data: await req.json(), gambar: null }
}

async function saveTendaImage(file: File | null): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined
  if (file.size > MAX_TENDA_IMAGE_SIZE || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Gambar tenda harus JPG, PNG, atau WebP dan maksimal 5 MB')
  }
  const extension = file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg'
  return saveUploadedFile(file, 'tenda', `tenda-${nanoid(16)}${extension}`)
}

export async function GET() {
  try {
    // hargaVendor adalah harga modal internal — hanya boleh terlihat oleh admin
    // (dashboard tenda), tidak oleh publik di alur sewa.
    const session = await getSession()
    const isAdmin = !!session

    const batasReservasi = new Date(Date.now() - TENDA_RESERVASI_JAM * 60 * 60 * 1000)
    const tendaList = await prisma.tendaJenis.findMany({ orderBy: { kapasitasMin: 'asc' } })

    const allSewa = await prisma.tendaSewa.findMany({
      select: {
        tendaJenisId: true,
        jumlah: true,
        sekolah: {
          select: {
            pembayaran: {
              where: { tipe: 'TENDA' },
              select: { statusPembayaran: true, updatedAt: true },
            },
          },
        },
      },
    })

    const terpakaiMap: Record<string, number> = {}
    for (const sewa of allSewa) {
      const pembayaranTenda = sewa.sekolah.pembayaran[0]
      if (
        !pembayaranTenda ||
        pembayaranTenda.statusPembayaran === 'DITOLAK' ||
        (pembayaranTenda.statusPembayaran === 'BELUM_BAYAR' && pembayaranTenda.updatedAt < batasReservasi)
      ) continue
      terpakaiMap[sewa.tendaJenisId] = (terpakaiMap[sewa.tendaJenisId] ?? 0) + sewa.jumlah
    }
    const reservasi = await prisma.reservasiTendaItem.findMany({ where: { reservasi: { expiresAt: { gt: new Date() } } }, select: { tendaJenisId: true, jumlah: true } })
    for (const item of reservasi) terpakaiMap[item.tendaJenisId] = (terpakaiMap[item.tendaJenisId] ?? 0) + item.jumlah

const data = tendaList.map((t) => ({
  id: t.id,
  nama: t.nama,
  gambarUrl: t.gambarUrl,
  namaVendor: isAdmin ? t.namaVendor : undefined,
  noWhatsappVendor: isAdmin ? t.noWhatsappVendor : undefined,
  kapasitasMin: t.kapasitasMin,
  kapasitasMax: t.kapasitasMax,
  harga: t.harga,
  hargaVendor: isAdmin ? t.hargaVendor : undefined,
  stokTotal: t.stokTotal,
  stokTersisa: Math.max(t.stokTotal - (terpakaiMap[t.id] ?? 0), 0),
}))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/tenda]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const { data: body, gambar } = await parseTendaRequest(req)
    const parsed = tendaJenisApiSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const gambarUrl = await saveTendaImage(gambar)
    const tenda = await prisma.tendaJenis.create({ data: { ...parsed.data, gambarUrl } })

    return NextResponse.json({ success: true, data: tenda }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tenda]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

