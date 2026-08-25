import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cekSekolahByIdDanNoWa, errorNoWaTidakCocok, terbitkanSesiSekolah } from '@/lib/verifikasi-sekolah'
import { checkRateLimit } from '@/lib/rate-limit'

const verifyNoWaSchema = z.object({ noWa: z.string().min(6, 'Nomor WhatsApp wajib diisi') })

/**
 * POST /api/sekolah/:id/pembayaran/verify
 *
 * Menerbitkan sesi pembayaran peserta (30 hari) setelah verifikasi
 * No. WhatsApp pembina cocok dengan sekolah ini.
 *
 * Dipakai saat pembina membuka link status dari perangkat yang TIDAK
 * punya sesi (mis. daftar di laptop, link dibuka di HP) lalu ingin upload
 * ulang bukti transfer. GET status tetap publik, tapi POST butuh sesi ini.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, { key: 'payment-verify', max: 30, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const { id } = await params

    const parsed = verifyNoWaSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'No. WhatsApp wajib diisi' }, { status: 400 })
    }

    const sekolah = await cekSekolahByIdDanNoWa(id, parsed.data.noWa)
    if (!sekolah) return errorNoWaTidakCocok()

    const response = NextResponse.json({ success: true })
    await terbitkanSesiSekolah(response, 'pembayaran', sekolah.id)
    return response
  } catch (error) {
    console.error('[POST /api/sekolah/:id/pembayaran/verify]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}