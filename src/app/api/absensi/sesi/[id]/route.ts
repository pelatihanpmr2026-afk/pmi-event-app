import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sesiSchema } from '@/lib/validations/absensi'
import { requireRole } from '@/lib/api-guard'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response

    const { id } = await params
    const body = await req.json()
    const parsed = sesiSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { nama, tanggal, jamMulai, jamSelesai } = parsed.data

    const sesi = await prisma.absensiSesi.update({
      where: { id },
      data: { nama, tanggal: new Date(tanggal), jamMulai, jamSelesai },
    })

    return NextResponse.json({ success: true, data: sesi })
  } catch (error) {
    console.error('[PATCH /api/absensi/sesi/:id]', error)
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

    const { id } = await params
    await prisma.absensiSesi.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Sesi berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/absensi/sesi/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}