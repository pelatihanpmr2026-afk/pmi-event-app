import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { prosesPengajuanSchema } from '@/lib/validations/pengajuan-anggaran'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = prosesPengajuanSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { aksi, catatanAdmin } = parsed.data

    const pengajuan = await prisma.pengajuanAnggaran.findUnique({ where: { id } })

    if (!pengajuan) {
      return NextResponse.json({ success: false, message: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    if (pengajuan.status !== 'MENUNGGU') {
      return NextResponse.json(
        { success: false, message: 'Pengajuan ini sudah diproses sebelumnya' },
        { status: 409 }
      )
    }

    const updated = await prisma.pengajuanAnggaran.update({
      where: { id },
      data: {
        status: aksi,
        catatanAdmin: aksi === 'DITOLAK' ? catatanAdmin : null,
        diprosesPada: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: { status: updated.status } })
  } catch (error) {
    console.error('[POST /api/pengajuan-anggaran/:id/proses]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}