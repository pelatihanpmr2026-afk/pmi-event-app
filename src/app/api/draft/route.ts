import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-guard'
import { normalizeNamaSekolah, namaSekolahKey } from '@/lib/sekolah'
import { MAX_REQUEST_BODY } from '@/lib/constants-sekolah'

// Masa berlaku link resume draft yang dibagikan ke pembina sekolah.
export const RESUME_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 hari

function newResumeToken(): string {
  return randomUUID()
}

// Rate limit draft sync per SEKOLAH, bukan per-IP: satu sekolah (apalagi di
// WiFi bersama) bisa menyimpan draft berkali-kali dalam sehari tanpa khawatir
// kena batas IP global yang dipakai banyak orang.
const DRAFT_SYNC_MAX = 300
const DRAFT_SYNC_WINDOW_MS = 60 * 60 * 1000
const draftSyncBuckets = new Map<string, { count: number; resetAt: number }>()

function checkDraftSyncRateLimit(key: string) {
  const now = Date.now()
  const bucket = draftSyncBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    draftSyncBuckets.set(key, { count: 1, resetAt: now + DRAFT_SYNC_WINDOW_MS })
    return true
  }
  bucket.count += 1
  return bucket.count <= DRAFT_SYNC_MAX
}

// Draft itu data KERJA (belum final) — isian parsial, kosong, atau belum
// tervalidasi WAJIB tetap tersimpan ke server supaya bisa dipulihkan panitia
// lewat dashboard / link resume. Berbeda dengan submit FINAL (/api/sekolah)
// yang tetap memvalidasi ketat, route draft sengaja LONGGAR: kita hanya
// menjamin bentuk umumnya sehat (objek dengan string berpanjang wajar, bukan
// tipe sampah) agar tidak menyimpan data korup. Saat restore,
// firstInvalidStep() di form akan memundurkan user ke step yang belum lengkap.
const draftSekolahSchema = z.object({
  namaSekolah: z.string().min(1).max(150),
  namaPembina: z.string().max(100).nullish(),
  noWhatsappPembina: z.string().max(20).nullish(),
  kategori: z.string().max(20).nullish(),
})

const draftPesertaItemSchema = z.object({
  namaLengkap: z.string().max(100).nullish(),
  tempatLahir: z.string().max(100).nullish(),
  tanggalLahir: z.string().max(10).nullish(),
  alamat: z.string().max(255).nullish(),
  noHp: z.string().max(15).nullish(),
  tahunMasuk: z.string().max(4).nullish(),
  agama: z.string().max(20).nullish(),
  golonganDarah: z.string().max(20).nullish(),
  gender: z.string().max(20).nullish(),
  riwayatPenyakit: z.string().max(40).nullish(),
  foto: z.string().nullish(),
})

// Tanpa batas jumlah & tanpa min saat draft — array boleh kosong sekalipun
// (mis. user baru mengisi data sekolah saja, atau sedang menghapus peserta).
const draftPesertaArraySchema = z.array(draftPesertaItemSchema)

const draftPendampingItemSchema = z.object({
  namaLengkap: z.string().max(100).nullish(),
  tempatLahir: z.string().max(100).nullish(),
  tanggalLahir: z.string().max(10).nullish(),
  alamat: z.string().max(255).nullish(),
  noHp: z.string().max(15).nullish(),
  tahunMasuk: z.string().max(4).nullish(),
  agama: z.string().max(20).nullish(),
  golonganDarah: z.string().max(20).nullish(),
  gender: z.string().max(20).nullish(),
})

const draftPendampingArraySchema = z.array(draftPendampingItemSchema)

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (contentLength > MAX_REQUEST_BODY) {
      return NextResponse.json({ success: false, message: 'Data draft terlalu besar.' }, { status: 413 })
    }

    const body = await req.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: 'Payload tidak valid' }, { status: 400 })
    }

    const parsedSekolah = draftSekolahSchema.safeParse(body.dataSekolah)
    if (!parsedSekolah.success) {
      console.warn('[POST /api/draft] Data sekolah malformed:', parsedSekolah.error.flatten().fieldErrors)
      return NextResponse.json({ success: false, message: 'Data sekolah tidak valid' }, { status: 400 })
    }

    const parsedPeserta = draftPesertaArraySchema.safeParse(
      Array.isArray(body.dataPeserta) ? body.dataPeserta : []
    )
    if (!parsedPeserta.success) {
      console.warn('[POST /api/draft] Data peserta malformed:', parsedPeserta.error.flatten().fieldErrors)
      return NextResponse.json({ success: false, message: 'Data peserta tidak valid' }, { status: 400 })
    }

    const parsedPendamping = draftPendampingArraySchema.safeParse(
      Array.isArray(body.dataPendamping) ? body.dataPendamping : []
    )
    if (!parsedPendamping.success) {
      console.warn('[POST /api/draft] Data pendamping malformed:', parsedPendamping.error.flatten().fieldErrors)
      return NextResponse.json({ success: false, message: 'Data pendamping tidak valid' }, { status: 400 })
    }

    const namaLengkap = normalizeNamaSekolah(parsedSekolah.data.namaSekolah)
    const key = namaSekolahKey(namaLengkap)

    // Rate limit per-sekolah (300/jam), agar WiFi sekolah tidak kena
    // pembatasan yang dialami bersama oleh banyak siswa.
    if (!checkDraftSyncRateLimit(key)) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak menyimpan draft untuk sekolah ini. Coba lagi beberapa saat.' },
        { status: 429 }
      )
    }

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
        // Token resume dibuat saat draft pertama disimpan. Update berikutnya
        // TIDAK mengganti token, sehingga link yang sudah dibagikan panitia ke
        // pembina tetap berlaku selama masa berlakunya.
        resumeToken: newResumeToken(),
        resumeTokenExpiresAt: new Date(Date.now() + RESUME_LINK_TTL_MS),
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
        resumeToken: d.resumeToken ?? null,
        resumeTokenExpiresAt: d.resumeTokenExpiresAt?.toISOString() ?? null,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/draft]', error)
    return NextResponse.json({ success: false, message: 'Gagal memuat draft' }, { status: 500 })
  }
}
