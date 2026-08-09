import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

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