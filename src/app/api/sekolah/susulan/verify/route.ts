import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cariSekolahByNoWa, errorNoWaTidakCocok, terbitkanSesiSekolah } from '@/lib/verifikasi-sekolah'
import { checkRateLimit } from '@/lib/rate-limit'

const verifyNoWaQuerySchema = z.object({ noWa: z.string().min(6, 'Nomor WhatsApp wajib diisi') })

/**
 * GET /api/sekolah/susulan/verify?noWa=...
 *
 * Public endpoint (tidak perlu login admin) — dipakai pembina sebelum masuk
 * ke form susulan. Karena ini publik, verifikasi memakai No. WhatsApp pembina
 * yang terdaftar (tidak mungkin ditebak orang lain seperti nama sekolah).
 *
 * Satu nomor WA bisa terdaftar di beberapa sekolah (pembina membina 2-3
 * sekolah), jadi:
 * - 1 sekolah cocok  → langsung terbitkan sesi susulan, `multi: false`.
 * - >1 sekolah cocok → TIDAK terbitkan sesi, `multi: true` + daftar sekolah
 *   untuk dipilih pembina (pilih → POST /api/sekolah/susulan/select).
 */
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'susulan-verify', max: 30, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const { searchParams } = new URL(req.url)
    const parsed = verifyNoWaQuerySchema.safeParse({
      noWa: searchParams.get('noWa') ?? '',
    })

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'No. WhatsApp wajib diisi' },
        { status: 400 }
      )
    }

    const { noWa } = parsed.data

    const sekolahList = await cariSekolahByNoWa(noWa)

    // Pesan sengaja digeneralisasi supaya tidak membantu menebak siapa pun.
    if (sekolahList.length === 0) return errorNoWaTidakCocok()

    // Hanya sekolah yang sudah pernah mendaftarkan peserta yang boleh susulan.
    const eligible = sekolahList.filter((s) => s.peserta.length > 0)

    if (eligible.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Sekolah dengan nomor ini belum pernah mendaftarkan peserta, gunakan alur pendaftaran biasa' },
        { status: 409 }
      )
    }

    function mapSekolah(s: (typeof eligible)[number]) {
      const lastBatch = s.pembayaran[0] ?? null
      return {
        sekolahId: s.id,
        namaLengkap: s.namaLengkap,
        kodePendaftaran: s.kodePendaftaran,
        kategori: s.kategori,
        batchTerakhir: lastBatch?.batchKe ?? 1,
        statusBatchTerakhir: lastBatch?.statusPembayaran ?? null,
      }
    }

    // Satu sekolah: langsung terbitkan sesi & lanjut.
    if (eligible.length === 1) {
      const response = NextResponse.json({ success: true, multi: false, data: mapSekolah(eligible[0]) })
      await terbitkanSesiSekolah(response, 'susulan', eligible[0].id)
      return response
    }

    // Beberapa sekolah: tampilkan daftar untuk dipilih, sesi diterbitkan di
    // POST /api/sekolah/susulan/select setelah pembina memilih.
    return NextResponse.json({ success: true, multi: true, data: { sekolah: eligible.map(mapSekolah) } })
  } catch (error) {
    console.error('[GET /api/sekolah/susulan/verify]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}