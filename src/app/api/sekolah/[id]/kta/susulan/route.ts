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
    const guard = await requireRole('KTA', 'KESEKRETARIATAN', 'SUPERADMIN')
    if (!guard.ok) return guard.response

    const { id } = await params
    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      select: {
        namaLengkap: true,
        kodePendaftaran: true,
        peserta: {
          where: { tipe: 'PESERTA', batchKe: { gt: 1 } },
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

    if (sekolah.peserta.length === 0) {
      return NextResponse.json({ success: false, message: 'Sekolah belum memiliki peserta susulan' }, { status: 400 })
    }

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
    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'EXPORT_KTA_SUSULAN', {
      targetType: 'SEKOLAH',
      targetId: id,
      metadata: { namaSekolah: sekolah.namaLengkap, kodePendaftaran: sekolah.kodePendaftaran, jumlahPeserta: peserta.length },
    })

    const safeName = sekolah.namaLengkap.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || `Sekolah-${id}`
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="KTA_Susulan_${safeName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/sekolah/:id/kta/susulan]', error)
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal membuat PDF KTA Susulan' }, { status: 500 })
  }
}
