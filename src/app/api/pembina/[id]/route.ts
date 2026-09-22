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
    const nama = body?.nama?.trim()

    if (!nama || nama.length < 2) {
      return NextResponse.json({ success: false, message: 'Nama pembina minimal 2 karakter' }, { status: 400 })
    }

    const existing = await prisma.pembina.findUnique({ where: { id }, include: { sekolah: { select: { namaLengkap: true } } } })
    if (!existing) return NextResponse.json({ success: false, message: 'Pembina tidak ditemukan' }, { status: 404 })

    await prisma.pembina.update({ where: { id }, data: { nama } })

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'UPDATE_PEMBINA', {
      targetType: 'SEKOLAH',
      targetId: existing.sekolahId,
      metadata: { namaSekolah: existing.sekolah.namaLengkap, previousNama: existing.nama, newNama: nama },
    })

    return NextResponse.json({ success: true, message: 'Nama pembina berhasil diperbarui' })
  } catch (error) {
    console.error('[PATCH /api/pembina/:id]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN', 'SUPERADMIN')
    if (!guard.ok) return guard.response

    const { id } = await params
    const existing = await prisma.pembina.findUnique({ where: { id }, include: { sekolah: { select: { namaLengkap: true } } } })
    if (!existing) return NextResponse.json({ success: false, message: 'Pembina tidak ditemukan' }, { status: 404 })

    await prisma.pembina.delete({ where: { id } })

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'DELETE_PEMBINA', {
      targetType: 'SEKOLAH',
      targetId: existing.sekolahId,
      metadata: { namaSekolah: existing.sekolah.namaLengkap, namaPembina: existing.nama },
    })

    return NextResponse.json({ success: true, message: 'Pembina berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/pembina/:id]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
