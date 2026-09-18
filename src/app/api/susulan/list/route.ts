import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireRole } from '@/lib/api-guard'

const DEFAULT_PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN', 'KTA')
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const sekolahId = searchParams.get('sekolahId') || undefined
    const kategori = searchParams.get('kategori') || undefined
    const search = (searchParams.get('search') ?? '').trim()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )

    // Cari sekolah yang memiliki peserta dengan batchKe > 1 (susulan)
    const where: Prisma.SekolahWhereInput = {
      kategori: kategori ? (kategori as 'WIRA' | 'MADYA') : undefined,
      ...(sekolahId ? { id: sekolahId } : {}),
      ...(search ? { namaLengkap: { contains: search } } : {}),
      peserta: { some: { batchKe: { gt: 1 } } },
    }

    const [sekolahList, total] = await Promise.all([
      prisma.sekolah.findMany({
        where,
        select: {
          id: true,
          namaLengkap: true,
          kategori: true,
          nomorPendaftaran: true,
          kodePendaftaran: true,
          peserta: {
            where: { batchKe: { gt: 1 } },
            select: { tipe: true, batchKe: true },
          },
          pembayaran: {
            where: { tipe: 'PESERTA', batchKe: { gt: 1 } },
            select: { batchKe: true, jumlahBiaya: true, statusPembayaran: true },
            orderBy: { batchKe: 'desc' },
          },
        },
        orderBy: { nomorPendaftaran: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sekolah.count({ where }),
    ])

    const data = sekolahList.map((s) => {
      const jumlahPeserta = s.peserta.filter((p) => p.tipe === 'PESERTA').length
      const jumlahPendamping = s.peserta.filter((p) => p.tipe === 'PENDAMPING').length
      const batchTertinggi = s.pembayaran.length > 0 ? Math.max(...s.pembayaran.map((p) => p.batchKe)) : 1
      const totalBiayaSusulan = s.pembayaran.reduce((sum, p) => sum + p.jumlahBiaya, 0)
      // Status bayar dari batch susulan terakhir
      const statusBayar = s.pembayaran[0]?.statusPembayaran ?? 'MENUNGGU_KONFIRMASI'

      return {
        id: s.id,
        namaLengkap: s.namaLengkap,
        kategori: s.kategori,
        nomorPendaftaran: s.nomorPendaftaran,
        kodePendaftaran: s.kodePendaftaran,
        jumlahPeserta,
        jumlahPendamping,
        batchTertinggi,
        totalBiayaSusulan,
        statusBayar,
      }
    })

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
    console.error('[GET /api/susulan/list]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
