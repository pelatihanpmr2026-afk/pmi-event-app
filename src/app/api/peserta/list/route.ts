import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireRole } from '@/lib/api-guard'

const DEFAULT_PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const tipe = (searchParams.get('tipe') === 'PENDAMPING' ? 'PENDAMPING' : 'PESERTA') as
      | 'PESERTA'
      | 'PENDAMPING'
    const sekolahId = searchParams.get('sekolahId') || undefined
    const kategori = searchParams.get('kategori') || undefined
    const search = (searchParams.get('search') ?? '').trim()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )

    const where: Prisma.PesertaWhereInput = {
      tipe,
      sekolahId,
      sekolah: {
        kategori: kategori ? (kategori as 'WIRA' | 'MADYA') : undefined,
        // Hanya tampilkan data dari sekolah yang pembayaran pesertanya sudah LUNAS.
        pembayaran: { some: { tipe: 'PESERTA', statusPembayaran: 'LUNAS' } },
        ...(search ? { OR: [{ namaLengkap: { contains: search } }] } : {}),
      },
      ...(search
        ? {
            OR: [
              { namaLengkap: { contains: search } },
              { noPeserta: { contains: search } },
            ],
          }
        : {}),
    }

    const [peserta, total] = await Promise.all([
      prisma.peserta.findMany({
        where,
        include: {
          sekolah: { select: { namaLengkap: true, kategori: true, nomorPendaftaran: true } },
        },
        orderBy: [{ sekolah: { nomorPendaftaran: 'asc' } }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.peserta.count({ where }),
    ])

    const data = peserta.map((p) => ({
      id: p.id,
      noPeserta: p.noPeserta ?? '-',
      namaLengkap: p.namaLengkap,
      sekolahNama: p.sekolah.namaLengkap,
      kategori: p.sekolah.kategori,
      tempatLahir: p.tempatLahir,
      tanggalLahir: p.tanggalLahir.toISOString(),
      alamat: p.alamat,
      agama: p.agama,
      golonganDarah: p.golonganDarah,
      tahunMasuk: p.tahunMasuk,
      noHp: p.noHp,
      gender: p.gender,
      riwayatPenyakit: p.riwayatPenyakit,
      fotoUrl: p.fotoUrl,
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
    console.error('[GET /api/peserta/list]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}