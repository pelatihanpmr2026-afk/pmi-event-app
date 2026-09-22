import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { kritikSaranSchema } from '@/lib/validations/kritik-saran'
import { checkRateLimit } from '@/lib/rate-limit'

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

/** GET /api/kritik-saran?page=&pageSize= — daftar terbaru untuk homepage (publik). */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )

    const [items, total] = await Promise.all([
      prisma.kritikSaran.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          nama: true,
          pesan: true,
          ratingPendaftaran: true,
          ratingPerkemahan: true,
          ratingAcara: true,
          createdAt: true,
        },
      }),
      prisma.kritikSaran.count(),
    ])
    return NextResponse.json({
      success: true,
      data: items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    })
  } catch (error) {
    console.error('[GET /api/kritik-saran]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}

/** POST /api/kritik-saran — kirim kritik & saran + penilaian (publik, di-rate-limit). */
export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'kritik-saran', max: 10, windowMs: 60 * 60 * 1000 })
    if (rl) return rl

    const body = await req.json().catch(() => null)
    const parsed = kritikSaranSchema.safeParse(body)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return NextResponse.json(
        { success: false, message: first?.message ?? 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const created = await prisma.kritikSaran.create({ data: parsed.data })
    return NextResponse.json(
      {
        success: true,
        message: 'Terima kasih atas kritik, saran, dan penilaianmu!',
        data: { ...created, createdAt: created.createdAt.toISOString() },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/kritik-saran]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
