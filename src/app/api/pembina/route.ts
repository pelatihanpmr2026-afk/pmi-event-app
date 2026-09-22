import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

export async function POST(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN', 'SUPERADMIN')
    if (!guard.ok) return guard.response

    const body = await req.json()
    const sekolahId = body?.sekolahId?.trim()
    const nama = body?.nama?.trim()

    if (!sekolahId) {
      return NextResponse.json({ success: false, message: 'sekolahId wajib diisi' }, { status: 400 })
    }
    if (!nama || nama.length < 2) {
      return NextResponse.json({ success: false, message: 'Nama pembina minimal 2 karakter' }, { status: 400 })
    }

    const sekolah = await prisma.sekolah.findUnique({ where: { id: sekolahId }, select: { namaLengkap: true } })
    if (!sekolah) return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })

    // Cek duplikat
    const duplikat = await prisma.pembina.findFirst({ where: { sekolahId, nama } })
    if (duplikat) {
      return NextResponse.json({ success: false, message: 'Pembina dengan nama tersebut sudah ada di sekolah ini' }, { status: 409 })
    }

    const pembina = await prisma.pembina.create({ data: { sekolahId, nama } })

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'CREATE_PEMBINA', {
      targetType: 'SEKOLAH',
      targetId: sekolahId,
      metadata: { namaSekolah: sekolah.namaLengkap, namaPembina: nama },
    })

    return NextResponse.json({ success: true, data: { id: pembina.id, nama: pembina.nama }, message: 'Pembina berhasil ditambahkan' })
  } catch (error) {
    console.error('[POST /api/pembina]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
