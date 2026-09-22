import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN', 'SUPERADMIN')
    if (!guard.ok) return guard.response

    const { id } = await params
    const body = await req.json()
    const namaPembina = body?.namaPembina?.trim()

    if (!namaPembina || namaPembina.length < 2) {
      return NextResponse.json({ success: false, message: 'Nama pembina minimal 2 karakter' }, { status: 400 })
    }

    const existing = await prisma.sekolah.findUnique({ where: { id }, select: { namaPembina: true, namaLengkap: true } })
    if (!existing) return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })

    await prisma.sekolah.update({ where: { id }, data: { namaPembina } })

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'UPDATE_PEMBINA', {
      targetType: 'SEKOLAH',
      targetId: id,
      metadata: { namaSekolah: existing.namaLengkap, previousNamaPembina: existing.namaPembina, newNamaPembina: namaPembina },
    })

    return NextResponse.json({ success: true, message: 'Nama pembina berhasil diperbarui' })
  } catch (error) {
    console.error('[PATCH /api/pembina/:id]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
