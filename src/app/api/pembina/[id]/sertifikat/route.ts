import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSertifikatPembinaPdf } from '@/lib/generate-sertifikat-pembina'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN', 'SUPERADMIN', 'KTA')
    if (!guard.ok) return guard.response

    const { id } = await params
    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      select: { namaPembina: true, namaLengkap: true },
    })

    if (!sekolah) return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })

    const buffer = await generateSertifikatPembinaPdf({
      namaPembina: sekolah.namaPembina,
      namaSekolah: sekolah.namaLengkap,
    })

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'EXPORT_SERTIFIKAT_PEMBINA', {
      targetType: 'SEKOLAH',
      targetId: id,
      metadata: { namaPembina: sekolah.namaPembina, namaSekolah: sekolah.namaLengkap },
    })

    const safeName = sekolah.namaLengkap.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || `Sekolah-${id}`
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Sertifikat_Pembina_${safeName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/pembina/:id/sertifikat]', error)
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal membuat sertifikat' }, { status: 500 })
  }
}
