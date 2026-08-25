import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAdmin } from '@/lib/api-guard'

const DEFAULT_PAGE_SIZE = 20

function pilihPembayaranPeserta<T extends { id: string; tipe: string; statusPembayaran: string; batchKe: number; jumlahBiaya: number }>(payments: T[]) {
  const peserta = payments.filter((p) => p.tipe === 'PESERTA').sort((a, b) => b.batchKe - a.batchKe)
  return peserta.find((p) => p.statusPembayaran === 'MENUNGGU_KONFIRMASI' || p.statusPembayaran === 'DITOLAK') ?? peserta[0] ?? null
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const sp = req.nextUrl.searchParams
    const page = Math.max(1, Number.parseInt(sp.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE))
    const search = (sp.get('search') ?? '').trim()
    const kategori = (sp.get('kategori') ?? '').trim()

    const where: Prisma.SekolahWhereInput = {
      ...(search
        ? {
            OR: [
              { namaLengkap: { contains: search } },
              { kodePendaftaran: { contains: search } },
            ],
          }
        : {}),
      ...(kategori
        ? { kategori: kategori as Prisma.SekolahWhereInput['kategori'] }
        : {}),
    }

    const [sekolahList, total] = await Promise.all([
      prisma.sekolah.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          peserta: { select: { tipe: true } },
          tendaSewa: { select: { jumlah: true } },
          pembayaran: true,
        },
      }),
      prisma.sekolah.count({ where }),
    ])

    const data = sekolahList.map((s) => {
      const pembayaranPeserta = pilihPembayaranPeserta(s.pembayaran)
      const pembayaranTenda = s.pembayaran.find((p) => p.tipe === 'TENDA') ?? null

      return {
        id: s.id,
        nomorPendaftaran: s.nomorPendaftaran,
        namaLengkap: s.namaLengkap,
        kodePendaftaran: s.kodePendaftaran,
        jenjang: s.jenjang,
        kategori: s.kategori,
        namaPembina: s.namaPembina,
        noWhatsappPembina: s.noWhatsappPembina,
        jumlahPeserta: s.peserta.filter((p) => p.tipe === 'PESERTA').length,
        jumlahPendamping: s.peserta.filter((p) => p.tipe === 'PENDAMPING').length,
        jumlahTenda: s.tendaSewa.reduce((sum, t) => sum + t.jumlah, 0),
        sudahCetak: s.sudahCetak,
        estimasiPesertaPendamping: s.estimasiPesertaPendamping,
        pembayaranPeserta: pembayaranPeserta
          ? {
              id: pembayaranPeserta.id,
              status: pembayaranPeserta.statusPembayaran,
              jumlahBiaya: pembayaranPeserta.jumlahBiaya,
              statusDaftarUlang: pembayaranPeserta.statusDaftarUlang,
              buktiTransferUrl: pembayaranPeserta.buktiTransferUrl,
              kwitansiUrl: pembayaranPeserta.kwitansiUrl,
            }
          : null,
        pembayaranTenda: pembayaranTenda
          ? {
              id: pembayaranTenda.id,
              status: pembayaranTenda.statusPembayaran,
              jumlahBiaya: pembayaranTenda.jumlahBiaya,
              buktiTransferUrl: pembayaranTenda.buktiTransferUrl,
              kwitansiUrl: pembayaranTenda.kwitansiUrl,
            }
          : null,
        createdAt: s.createdAt.toISOString(),
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
    console.error('[GET /api/sekolah/list]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}