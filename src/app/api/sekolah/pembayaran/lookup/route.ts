import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cariSekolahByNoWa, errorNoWaTidakCocok, terbitkanSesiSekolah } from '@/lib/verifikasi-sekolah'
import { checkRateLimit } from '@/lib/rate-limit'

const verifyNoWaQuerySchema = z.object({ noWa: z.string().min(6, 'Nomor WhatsApp wajib diisi') })

/**
 * GET /api/sekolah/pembayaran/lookup?noWa=...
 *
 * Public (tidak perlu login admin) — dipakai halaman "Status Pembayaran &
 * Kwitansi" untuk menemukan sekolah yang sudah terdaftar memakai No. WhatsApp
 * pembina. Tanpa verifikasi ini, pembina yang sudah daftar (atau submit
 * kembar/beruntun) tidak punya jalan lagi ke halaman status & download
 * kwitansi karena URL /sekolah/pembayaran/[id] hanya didapat saat submit sukses.
 *
 * Satu nomor WA bisa terdaftar di beberapa sekolah, jadi:
 * - 1 sekolah cocok  → langsung terbitkan sesi pembayaran, `multi: false`.
 * - >1 sekolah cocok → TIDAK terbitkan sesi, `multi: true` + daftar sekolah
 *   untuk dipilih (pilih → POST /api/sekolah/pembayaran/select).
 */
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'status-lookup', max: 30, windowMs: 15 * 60 * 1000 })
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

    // Hanya sekolah yang sudah pernah mendaftarkan peserta yang punya status
    // pembayaran & kwitansi. Sekolah yang cuma pernah menyewa tenda (tanpa
    // peserta) belum punya status peserta.
    const terdaftar = sekolahList.filter((s) => s.peserta.length > 0)

    if (terdaftar.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Sekolah dengan nomor ini belum pernah mendaftarkan peserta, gunakan alur pendaftaran biasa' },
        { status: 409 }
      )
    }

    function mapSekolah(s: (typeof terdaftar)[number]) {
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

    // Satu sekolah: langsung terbitkan sesi pembayaran & lanjut ke status.
    if (terdaftar.length === 1) {
      const response = NextResponse.json({ success: true, multi: false, data: mapSekolah(terdaftar[0]) })
      await terbitkanSesiSekolah(response, 'pembayaran', terdaftar[0].id)
      return response
    }

    // Beberapa sekolah: tampilkan daftar untuk dipilih, sesi diterbitkan di
    // POST /api/sekolah/pembayaran/select setelah pembina memilih.
    return NextResponse.json({ success: true, multi: true, data: { sekolah: terdaftar.map(mapSekolah) } })
  } catch (error) {
    console.error('[GET /api/sekolah/pembayaran/lookup]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}