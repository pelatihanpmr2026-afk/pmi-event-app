import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { getAbsolutePathFromUrl } from '@/lib/save-file'
import { generateKtaPdf } from '@/lib/generate-kta-pdf'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KTA')
    if (!guard.ok) return guard.response

    const { id } = await params
    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      select: {
        namaLengkap: true,
        kodePendaftaran: true,
        peserta: {
          where: { tipe: 'PESERTA' },
          orderBy: [{ noPeserta: 'asc' }, { createdAt: 'asc' }],
          select: {
            noPeserta: true,
            namaLengkap: true,
            tempatLahir: true,
            tanggalLahir: true,
            alamat: true,
            agama: true,
            golonganDarah: true,
            fotoUrl: true,
          },
        },
      },
    })
    if (!sekolah) return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })

    const peserta = await Promise.all(sekolah.peserta.map(async (participant) => {
      let fotoBuffer: Buffer | undefined
      if (participant.fotoUrl) {
        try {
          fotoBuffer = await readFile(getAbsolutePathFromUrl(participant.fotoUrl))
        } catch {
          // PDF tetap dibuat; generator menampilkan placeholder bila foto hilang.
        }
      }
      return { ...participant, fotoBuffer }
    }))

    const buffer = await generateKtaPdf({ namaSekolah: sekolah.namaLengkap, peserta })
    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'EXPORT_KTA_SEKOLAH', {
      targetType: 'SEKOLAH',
      targetId: id,
      metadata: { namaSekolah: sekolah.namaLengkap, kodePendaftaran: sekolah.kodePendaftaran, jumlahPeserta: peserta.length },
    })

    const safeName = sekolah.namaLengkap.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || sekolah.kodePendaftaran
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="KTA_${safeName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/sekolah/:id/kta/pdf]', error)
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal membuat PDF KTA' }, { status: 500 })
  }
}
