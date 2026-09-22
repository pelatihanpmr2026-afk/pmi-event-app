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
      ? { sekolah: { namaLengkap: { contains: search } } }
      : {}

    const [allPembina, total] = await Promise.all([
      prisma.pembina.findMany({
        where,
        include: { sekolah: { select: { id: true, namaLengkap: true, kategori: true } } },
        orderBy: [{ sekolah: { namaLengkap: 'asc' } }, { nama: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pembina.count({ where }),
    ])

    const data = allPembina.map((p, i) => ({
      id: p.id,
      no: (page - 1) * pageSize + i + 1,
      namaPembina: p.nama,
      namaSekolah: p.sekolah.namaLengkap,
      kategori: p.sekolah.kategori,
      sekolahId: p.sekolah.id,
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
