import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { generateExcelSusulanMultiSheetBuffer, type RekapRow } from '@/lib/generate-excel-peserta-rekap'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN', 'KTA')
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const sekolahId = searchParams.get('sekolahId') || undefined
    const kategori = searchParams.get('kategori') || undefined

    const sekolahFilter: Prisma.SekolahWhereInput = {
      ...(kategori ? { kategori: kategori as 'WIRA' | 'MADYA' } : {}),
      ...(sekolahId ? { id: sekolahId } : {}),
      pembayaran: { some: { tipe: 'PESERTA', statusPembayaran: 'LUNAS' } },
    }

    const [pesertaData, pendampingData] = await Promise.all([
      prisma.peserta.findMany({
        where: {
          tipe: 'PESERTA',
          batchKe: { gt: 1 },
          sekolah: sekolahFilter,
        },
        include: { sekolah: { select: { namaLengkap: true, kodePendaftaran: true } } },
        orderBy: [{ sekolah: { nomorPendaftaran: 'asc' } }, { batchKe: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.peserta.findMany({
        where: {
          tipe: 'PENDAMPING',
          batchKe: { gt: 1 },
          sekolah: sekolahFilter,
        },
        include: { sekolah: { select: { namaLengkap: true, kodePendaftaran: true } } },
        orderBy: [{ sekolah: { nomorPendaftaran: 'asc' } }, { createdAt: 'asc' }],
      }),
    ])

    // Ambil batchKe yang DITOLAK per sekolah
    const sekolahIds = [...new Set([...pesertaData.map((p) => p.sekolahId), ...pendampingData.map((p) => p.sekolahId)])]
    const dibatalkanList = await prisma.pembayaran.findMany({
      where: { sekolahId: { in: sekolahIds }, tipe: 'PESERTA', statusPembayaran: 'DITOLAK' },
      select: { sekolahId: true, batchKe: true },
    })
    const batchDibatalkanMap = new Map<string, Set<number>>()
    for (const d of dibatalkanList) {
      if (!batchDibatalkanMap.has(d.sekolahId)) batchDibatalkanMap.set(d.sekolahId, new Set())
      batchDibatalkanMap.get(d.sekolahId)!.add(d.batchKe)
    }

    function isBatchValid(sid: string, batch: number): boolean {
      return !batchDibatalkanMap.get(sid)?.has(batch)
    }

    function toRow(p: (typeof pesertaData)[number]): RekapRow {
      return {
        noPeserta: p.noPeserta ?? '-',
        namaLengkap: p.namaLengkap,
        sekolahNama: p.sekolah.namaLengkap,
        tempatLahir: p.tempatLahir,
        tanggalLahir: p.tanggalLahir,
        alamat: p.alamat,
        agama: p.agama,
        golonganDarah: p.golonganDarah,
        tahunMasuk: p.tahunMasuk,
        noHp: p.noHp,
        gender: p.gender,
        riwayatPenyakit: p.riwayatPenyakit,
      }
    }

    const pesertaRows = pesertaData.filter((p) => isBatchValid(p.sekolahId, p.batchKe)).map(toRow)
    const pendampingRows = pendampingData.filter((p) => isBatchValid(p.sekolahId, p.batchKe)).map(toRow)

    const buffer = await generateExcelSusulanMultiSheetBuffer(pesertaRows, pendampingRows)
    const filename = `Data_Susulan_${new Date().toISOString().slice(0, 10)}.xlsx`

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'EXPORT_SUSULAN', {
      targetType: 'PESERTA',
      metadata: {
        sekolahId: sekolahId ?? '-',
        kategori: kategori ?? '-',
        jumlahPeserta: pesertaRows.length,
        jumlahPendamping: pendampingRows.length,
      },
    })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/susulan/export]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
