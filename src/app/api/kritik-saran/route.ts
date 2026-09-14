import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { kritikSaranSchema } from '@/lib/validations/kritik-saran'
import { checkRateLimit } from '@/lib/rate-limit'

const LIST_LIMIT = 20

/** GET /api/kritik-saran — daftar terbaru untuk homepage (publik). */
export async function GET() {
  try {
    const items = await prisma.kritikSaran.findMany({
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
      select: {
        id: true,
        nama: true,
        pesan: true,
        ratingPendaftaran: true,
        ratingPerkemahan: true,
        ratingAcara: true,
        createdAt: true,
      },
    })
    return NextResponse.json({
      success: true,
      data: items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
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
