import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const divisi = searchParams.get('divisi') ?? ''

    const pengajuan = await prisma.pengajuanAnggaran.findMany({
      where: {
        status: 'DISETUJUI',
        ...(divisi ? { divisi: divisi as never } : {}),
      },
      select: {
        id: true,
        nomorPengajuan: true,
        namaKoordinator: true,
        divisi: true,
        totalPengajuan: true,
        transaksi: {
          select: { kredit: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const data = pengajuan
      .map((p) => {
        const sudahDipakai = p.transaksi.reduce((s, t) => s + t.kredit, 0)
        const sisa = Math.max(p.totalPengajuan - sudahDipakai, 0)
        return {
          id: p.id,
          nomorPengajuan: p.nomorPengajuan,
          namaKoordinator: p.namaKoordinator,
          divisi: p.divisi,
          totalPengajuan: p.totalPengajuan,
          sudahDipakai,
          sisa,
        }
      })
      .filter((p) => p.sisa > 0)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/keuangan/pengajuan-tersedia]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}