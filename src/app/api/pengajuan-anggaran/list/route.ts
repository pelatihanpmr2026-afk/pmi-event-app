import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'

export async function GET() {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response

    const data = await prisma.pengajuanAnggaran.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nomorPengajuan: true,
        namaKoordinator: true,
        divisi: true,
        noHp: true,
        totalJenisBarang: true,
        totalKuantitas: true,
        totalPengajuan: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/pengajuan-anggaran/list]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}