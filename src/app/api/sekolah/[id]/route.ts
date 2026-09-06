import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteFileByUrl } from '@/lib/save-file'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole('KESEKRETARIATAN')
  if (!guard.ok) return guard.response

  try {
    const { id } = await params
    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      select: {
        namaLengkap: true,
        kodePendaftaran: true,
        excelUrl: true,
        suratPernyataanUrl: true,
        tandaTanganPenanggungJawabUrl: true,
        peserta: { select: { fotoUrl: true } },
        pembayaran: { select: { buktiTransferUrl: true, kwitansiUrl: true } },
      },
    })

    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }

    const files = [
      sekolah.excelUrl,
      sekolah.suratPernyataanUrl,
      sekolah.tandaTanganPenanggungJawabUrl,
      ...sekolah.peserta.map((peserta) => peserta.fotoUrl),
      ...sekolah.pembayaran.flatMap((pembayaran) => [pembayaran.buktiTransferUrl, pembayaran.kwitansiUrl]),
    ].filter((url): url is string => Boolean(url))

    await prisma.sekolah.delete({ where: { id } })
    await Promise.all(files.map((url) => deleteFileByUrl(url)))

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'HAPUS_SEKOLAH', {
      targetType: 'SEKOLAH',
      targetId: id,
      metadata: { targetName: sekolah.namaLengkap, kodePendaftaran: sekolah.kodePendaftaran },
    })

    return NextResponse.json({ success: true, message: 'Pendaftaran sekolah berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/sekolah/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal menghapus pendaftaran sekolah' }, { status: 500 })
  }
}
