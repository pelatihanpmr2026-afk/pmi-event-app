import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { getAbsolutePathFromUrl } from '@/lib/save-file'
import { generateExcelSekolahBuffer } from '@/lib/generate-excel-sekolah'
import { sanitizeFilename } from '@/lib/sekolah'
import { requireAdmin } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      include: { peserta: { orderBy: { createdAt: 'asc' } } },
    })
    if (!sekolah) return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })

    const peserta = await Promise.all(
      sekolah.peserta.filter((p) => p.tipe === 'PESERTA').map(async (p) => {
        let fotoBuffer: Buffer | undefined
        if (p.fotoUrl) {
          try { fotoBuffer = await readFile(getAbsolutePathFromUrl(p.fotoUrl)) } catch { /* Tetap ekspor bila foto tidak ada. */ }
        }
        return { ...p, fotoBuffer }
      })
    )
    const pendamping = sekolah.peserta.filter((p) => p.tipe === 'PENDAMPING')
    const buffer = await generateExcelSekolahBuffer({
      namaSekolah: sekolah.namaLengkap,
      kodePendaftaran: sekolah.kodePendaftaran,
      peserta,
      pendamping,
    })
    const filename = `Data_${sanitizeFilename(sekolah.kodePendaftaran)}.xlsx`

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'EXPORT_SEKOLAH', {
      targetType: 'SEKOLAH',
      targetId: id,
      metadata: {
        namaSekolah: sekolah.namaLengkap,
        kodePendaftaran: sekolah.kodePendaftaran,
        jumlahPeserta: peserta.length,
        jumlahPendamping: pendamping.length,
      },
    })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/sekolah/:id/export]', error)
    return NextResponse.json({ success: false, message: 'Gagal membuat Excel' }, { status: 500 })
  }
}
