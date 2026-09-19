import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const where = {
      kategori: kategori ? (kategori as 'WIRA' | 'MADYA') : undefined,
      ...(sekolahId ? { id: sekolahId } : {}),
      ...(search ? { namaLengkap: { contains: search } } : {}),
      peserta: { some: { batchKe: { gt: 1 } } },
    }

    const allSekolah = await prisma.sekolah.findMany({
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
          orderBy: { batchKe: 'desc' as const },
        },
      },
      orderBy: { nomorPendaftaran: 'asc' as const },
    })

    const mapped = allSekolah.map((s) => {
      const batchDibatalkan = new Set(
        s.pembayaran.filter((p) => p.statusPembayaran === 'DITOLAK').map((p) => p.batchKe)
      )
      const jumlahPeserta = s.peserta.filter((p) => p.tipe === 'PESERTA' && !batchDibatalkan.has(p.batchKe)).length
      const jumlahPendamping = s.peserta.filter((p) => p.tipe === 'PENDAMPING' && !batchDibatalkan.has(p.batchKe)).length
      const pembayaranAktif = s.pembayaran.filter((p) => p.statusPembayaran !== 'DITOLAK')
      const batchTertinggi = pembayaranAktif.length > 0 ? Math.max(...pembayaranAktif.map((p) => p.batchKe)) : 1
      const totalBiayaSusulan = pembayaranAktif.reduce((sum, p) => sum + p.jumlahBiaya, 0)
      const statusBayar = pembayaranAktif[0]?.statusPembayaran ?? 'MENUNGGU_KONFIRMASI'

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
    }).filter((s) => s.jumlahPeserta > 0 || s.jumlahPendamping > 0)

    const total = mapped.length
    const start = (page - 1) * pageSize
    const data = mapped.slice(start, start + pageSize)

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
