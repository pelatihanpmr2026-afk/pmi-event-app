import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'

const DEFAULT_PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN', 'SUPERADMIN', 'KTA')
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') ?? '').trim()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )

    const where = search
      ? { namaLengkap: { contains: search } }
      : {}

    const allSekolah = await prisma.sekolah.findMany({
      where,
      select: {
        id: true,
        namaPembina: true,
        namaLengkap: true,
      },
      orderBy: { namaLengkap: 'asc' },
    })

    const total = allSekolah.length
    const start = (page - 1) * pageSize
    const data = allSekolah.slice(start, start + pageSize).map((s, i) => ({
      id: s.id,
      no: start + i + 1,
      namaPembina: s.namaPembina,
      namaSekolah: s.namaLengkap,
    }))

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('[GET /api/pembina/list]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
