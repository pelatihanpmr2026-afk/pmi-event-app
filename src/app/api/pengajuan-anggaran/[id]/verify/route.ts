import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { normalizeNoWa } from '@/lib/validations/susulan'
import { checkRateLimit } from '@/lib/rate-limit'

const verifyPengajuanSchema = z.object({
  noHp: z.string().min(6, 'Nomor WhatsApp wajib diisi'),
})

/**
 * POST /api/pengajuan-anggaran/:id/verify
 *
 * Verifikasi kepemilikan pengajuan dengan No. WhatsApp koordinator yang
 * terdaftar. Cocok → kembalikan data pengajuan + items (untuk prefill form
 * edit). Tidak cocok → 404 generik (tidak membantu menebak).
 *
 * Public, rate-limited. Endpoint ini TIDAK menerbitkan sesi — setiap aksi
 * edit (POST /edit) memverifikasi ulang noHp.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, { key: 'pengajuan-verify', max: 30, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const { id } = await params

    const parsed = verifyPengajuanSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Nomor WhatsApp wajib diisi' }, { status: 400 })
    }

    const pengajuan = await prisma.pengajuanAnggaran.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!pengajuan) {
      return NextResponse.json({ success: false, message: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    // Pesan digeneralisasi supaya tidak membocorkan data pengajuan.
    if (normalizeNoWa(pengajuan.noHp) !== normalizeNoWa(parsed.data.noHp)) {
      return NextResponse.json(
        { success: false, message: 'No. WhatsApp koordinator tidak cocok dengan pengajuan ini' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: pengajuan.id,
        nomorPengajuan: pengajuan.nomorPengajuan,
        status: pengajuan.status,
        namaKoordinator: pengajuan.namaKoordinator,
        divisi: pengajuan.divisi,
        totalJenisBarang: pengajuan.totalJenisBarang,
        totalKuantitas: pengajuan.totalKuantitas,
        totalPengajuan: pengajuan.totalPengajuan,
        items: pengajuan.items,
      },
    })
  } catch (error) {
    console.error('[POST /api/pengajuan-anggaran/:id/verify]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}