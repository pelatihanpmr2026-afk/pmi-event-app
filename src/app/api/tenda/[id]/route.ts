import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { tendaJenisApiSchema } from '@/lib/validations/tenda-jenis'

export async function PATCH(
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
    const parsed = tendaJenisApiSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const tenda = await prisma.tendaJenis.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ success: true, data: tenda })
  } catch (error) {
    console.error('[PATCH /api/tenda/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

    const { id } = await params

    const jumlahTerpakai = await prisma.tendaSewa.count({ where: { tendaJenisId: id } })

    if (jumlahTerpakai > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak bisa dihapus — jenis tenda ini sudah pernah/sedang disewa oleh ${jumlahTerpakai} sekolah. Set stok jadi 0 kalau ingin menghentikan penyewaan baru.`,
        },
        { status: 409 }
      )
    }

    await prisma.tendaJenis.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Jenis tenda berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/tenda/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}