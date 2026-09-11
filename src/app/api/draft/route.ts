import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { normalizeNamaSekolah, namaSekolahKey } from '@/lib/sekolah'
import { dataSekolahSchema } from '@/lib/validations/sekolah'
import { pendampingArraySchema } from '@/lib/validations/peserta'
import { MAX_REQUEST_BODY } from '@/lib/constants-sekolah'

const MAX_PHOTOS = 60

const draftPesertaItemSchema = z.object({
  namaLengkap: z.string().min(3).max(100),
  tempatLahir: z.string().min(2).max(100),
  tanggalLahir: z.string(),
  alamat: z.string().min(5).max(255),
  agama: z.enum(['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA']),
  golonganDarah: z.enum(['A', 'B', 'AB', 'O', 'TIDAK_TAHU']),
  tahunMasuk: z.string(),
  noHp: z.string().max(15).optional().or(z.literal('')),
  gender: z.enum(['LAKI_LAKI', 'PEREMPUAN']),
  riwayatPenyakit: z.enum([
    'TIDAK_ADA', 'ASMA_BERAT', 'EPILEPSI', 'JANTUNG', 'DIABETES', 'HIPERTENSI_BERAT',
    'GANGGUAN_GINJAL', 'GANGGUAN_PERNAPASAN_KRONIS', 'RIWAYAT_KEJANG', 'HEMOFILIA',
    'ANEMIA_BERAT', 'LAINNYA',
  ]),
  foto: z.string().nullable().optional(),
})

const draftPesertaArraySchema = z
  .array(draftPesertaItemSchema)
  .min(1, 'Minimal 1 peserta')
  .max(MAX_PHOTOS, `Maksimal ${MAX_PHOTOS} peserta`)

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'draft-sync', max: 30, windowMs: 60 * 60 * 1000 })
    if (rl) return rl

    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (contentLength > MAX_REQUEST_BODY) {
      return NextResponse.json({ success: false, message: 'Data draft terlalu besar.' }, { status: 413 })
    }

    const body = await req.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: 'Payload tidak valid' }, { status: 400 })
    }

    const parsedSekolah = dataSekolahSchema.safeParse(body.dataSekolah)
    if (!parsedSekolah.success) {
      return NextResponse.json({ success: false, message: 'Data sekolah tidak valid' }, { status: 400 })
    }

    const parsedPeserta = draftPesertaArraySchema.safeParse(body.dataPeserta)
    if (!parsedPeserta.success) {
      return NextResponse.json({ success: false, message: 'Data peserta tidak valid' }, { status: 400 })
    }

    const parsedPendamping = pendampingArraySchema.safeParse(body.dataPendamping ?? [])
    if (!parsedPendamping.success) {
      return NextResponse.json({ success: false, message: 'Data pendamping tidak valid' }, { status: 400 })
    }

    const namaLengkap = normalizeNamaSekolah(parsedSekolah.data.namaSekolah)
    const key = namaSekolahKey(namaLengkap)

    // Cek apakah sekolah sudah terdaftar (punya peserta)
    const existing = await prisma.sekolah.findFirst({
      where: { namaLengkap: namaLengkap },
      include: { _count: { select: { peserta: true } } },
    })
    if (existing && existing._count.peserta > 0) {
      return NextResponse.json(
        { success: false, message: `"${namaLengkap}" sudah terdaftar. Draft tidak perlu disimpan.` },
        { status: 409 }
      )
    }

    const currentStep = typeof body.currentStep === 'number' ? body.currentStep : 1

    await prisma.draft.upsert({
      where: { namaSekolahKey: key },
      create: {
        namaSekolahKey: key,
        namaSekolah: namaLengkap,
        currentStep,
        dataSekolah: parsedSekolah.data,
        dataPeserta: parsedPeserta.data,
        dataPendamping: parsedPendamping.data,
      },
      update: {
        namaSekolah: namaLengkap,
        currentStep,
        dataSekolah: parsedSekolah.data,
        dataPeserta: parsedPeserta.data,
        dataPendamping: parsedPendamping.data,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/draft]', error)
    return NextResponse.json({ success: false, message: 'Gagal menyimpan draft' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() ?? ''

    const where = q ? { namaSekolah: { contains: q } } : {}

    const drafts = await prisma.draft.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    const data = drafts.map((d) => {
      const ds = (d.dataSekolah ?? {}) as Record<string, unknown>
      const dp = Array.isArray(d.dataPeserta) ? d.dataPeserta : []
      return {
        id: d.id,
        namaSekolah: d.namaSekolah,
        namaPembina: ds.namaPembina ?? null,
        currentStep: d.currentStep,
        jumlahPeserta: dp.length,
        updatedAt: d.updatedAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/draft]', error)
    return NextResponse.json({ success: false, message: 'Gagal memuat draft' }, { status: 500 })
  }
}
