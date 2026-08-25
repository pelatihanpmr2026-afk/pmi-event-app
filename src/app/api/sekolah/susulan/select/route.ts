import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cekSekolahByIdDanNoWa, errorNoWaTidakCocok, terbitkanSesiSekolah } from '@/lib/verifikasi-sekolah'
import { checkRateLimit } from '@/lib/rate-limit'

const pilihSekolahSchema = z.object({
  sekolahId: z.string().min(1, 'Sekolah wajib dipilih'),
  noWa: z.string().min(6, 'Nomor WhatsApp wajib diisi'),
})

/**
 * POST /api/sekolah/susulan/select
 *
 * Dipakai saat no WA pembina terdaftar di >1 sekolah dan pembina memilih
 * salah satunya dari daftar. Verifikasi ulang kepemilikan lalu terbitkan
 * sesi susulan untuk sekolah terpilih.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'susulan-select', max: 30, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const parsed = pilihSekolahSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Sekolah dan No. WhatsApp wajib diisi' }, { status: 400 })
    }

    const { sekolahId, noWa } = parsed.data

    const sekolah = await cekSekolahByIdDanNoWa(sekolahId, noWa)
    if (!sekolah) return errorNoWaTidakCocok()

    if (sekolah.peserta.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Sekolah ini belum pernah mendaftarkan peserta, gunakan alur pendaftaran biasa' },
        { status: 409 }
      )
    }

    const lastBatch = sekolah.pembayaran[0] ?? null
    const response = NextResponse.json({
      success: true,
      data: {
        sekolahId: sekolah.id,
        namaLengkap: sekolah.namaLengkap,
        kodePendaftaran: sekolah.kodePendaftaran,
        kategori: sekolah.kategori,
        batchTerakhir: lastBatch?.batchKe ?? 1,
        statusBatchTerakhir: lastBatch?.statusPembayaran ?? null,
      },
    })
    await terbitkanSesiSekolah(response, 'susulan', sekolah.id)
    return response
  } catch (error) {
    console.error('[POST /api/sekolah/susulan/select]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}