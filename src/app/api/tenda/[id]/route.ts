import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tendaJenisApiSchema } from '@/lib/validations/tenda-jenis'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response
    const session = guard.session

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

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'EDIT_JENIS_TENDA',
      {
        targetType: 'TENDA',
        targetId: id,
        metadata: {
          targetName: tenda.nama,
          harga: tenda.harga,
          stokTotal: tenda.stokTotal,
        },
      }
    )

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
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const { id } = await params

    // FIX: Ambil tenda dulu sebelum dihapus
    const tenda = await prisma.tendaJenis.findUnique({
      where: { id },
    })
    if (!tenda) {
      return NextResponse.json({ success: false, message: 'Tenda tidak ditemukan' }, { status: 404 })
    }

    const jumlahTerpakai = await prisma.tendaSewa.count({ where: { tendaJenisId: id } })
    if (jumlahTerpakai > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak bisa dihapus — jenis tenda ini sudah pernah/sedang disewa oleh sekolah.`,
        },
        { status: 409 }
      )
    }

    await prisma.tendaJenis.delete({ where: { id } })

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'HAPUS_JENIS_TENDA',
      {
        targetType: 'TENDA',
        targetId: id,
        metadata: { targetName: tenda.nama },
      }
    )

    return NextResponse.json({ success: true, message: 'Jenis tenda berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/tenda/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}