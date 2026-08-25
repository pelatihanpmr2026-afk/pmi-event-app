import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cekSekolahByIdDanNoWa, errorNoWaTidakCocok, terbitkanSesiSekolah } from '@/lib/verifikasi-sekolah'
import { checkRateLimit } from '@/lib/rate-limit'

const verifyTendaSchema = z.object({
  sekolahId: z.string().min(1, 'Sekolah wajib dipilih'),
  noWa: z.string().min(6, 'Nomor WhatsApp wajib diisi'),
})

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'tenda-verify', max: 30, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const parsed = verifyTendaSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ success: false, message: 'Sekolah dan No. WhatsApp wajib diisi' }, { status: 400 })

    const { sekolahId, noWa } = parsed.data

    const sekolah = await cekSekolahByIdDanNoWa(sekolahId, noWa)
    if (!sekolah) return errorNoWaTidakCocok()

    const response = NextResponse.json({ success: true, data: { id: sekolah.id, namaLengkap: sekolah.namaLengkap, kategori: sekolah.kategori, namaPembina: sekolah.namaPembina } })
    await terbitkanSesiSekolah(response, 'tenda', sekolah.id)
    return response
  } catch (error) { console.error('[POST /api/sekolah/tenda/verify]', error); return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 }) }
}