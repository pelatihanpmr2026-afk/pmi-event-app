import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { konfirmasiPembayaranSchema } from '@/lib/validations/pembayaran'
import { canConfirmPembayaran } from '@/lib/admin-role'
import { assignNoPesertaForSekolah } from '@/lib/no-peserta'
import { generateSuratPernyataan } from '@/lib/generate-surat-pernyataan'
import { sanitizeFilename } from '@/lib/sekolah'
import { logAdminAction } from '@/lib/admin-log'
import { getAbsolutePathFromUrl } from '@/lib/save-file'
import { readFile } from 'fs/promises'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }
    if (!canConfirmPembayaran(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Role kamu tidak memiliki izin untuk konfirmasi pembayaran' },
        { status: 403 }
      )
    }
    const { id } = await params
    const body = await req.json()
    const parsed = konfirmasiPembayaranSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { aksi, catatanAdmin } = parsed.data

    const pembayaran = await prisma.pembayaran.findUnique({
      where: { id },
      include: { sekolah: true },
    })
    if (!pembayaran) {
      return NextResponse.json({ success: false, message: 'Data pembayaran tidak ditemukan' }, { status: 404 })
    }
    if (pembayaran.statusPembayaran !== 'MENUNGGU_KONFIRMASI') {
      return NextResponse.json(
        { success: false, message: 'Pembayaran ini tidak sedang menunggu konfirmasi' },
        { status: 409 }
      )
    }

    // Untuk LUNAS tipe PESERTA, update status + generate No Peserta dilakukan
    // dalam SATU transaksi serializable — kalau penomoran gagal, status tidak
    // jadi LUNAS (rollback), sehingga TIDAK akan ada peserta yang LUNAS tapi
    // No Pesertanya kosong. untuk TENDA/DITOLAK cukup update biasa.
    const updated =
      aksi === 'LUNAS' && pembayaran.tipe === 'PESERTA'
        ? await prisma.$transaction(
            async (tx) => {
              const updated = await tx.pembayaran.update({
                where: { id },
                data: {
                  statusPembayaran: aksi,
                  catatanAdmin: null,
                  dikonfirmasiPada: new Date(),
                },
              })
              await assignNoPesertaForSekolah(pembayaran.sekolahId, tx)
              return updated
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
          )
        : await prisma.pembayaran.update({
            where: { id },
            data: {
              statusPembayaran: aksi,
              catatanAdmin: aksi === 'DITOLAK' ? catatanAdmin : null,
              dikonfirmasiPada: new Date(),
            },
          })

    // Efek tambahan saat Pembayaran Peserta disetujui LUNAS — generate Surat
    // Pernyataan JIKA BELUM ADA. Surat biasanya sudah dibuat saat pendaftaran
    // (non-blokir) supaya tombol download langsung muncul; blok ini jadi
    // fallback untuk data lama yang suratnya belum pernah dibuat. Ini
    // non-atomik dengan status LUNAS (best-effort), jadi kalau gagal hanya
    // di-log dan surat bisa dibuat ulang.
    if (aksi === 'LUNAS' && pembayaran.tipe === 'PESERTA' && !pembayaran.sekolah.suratPernyataanUrl) {
      try {
        let tandaTanganBuffer: Buffer | null = null
        if (pembayaran.sekolah.tandaTanganPenanggungJawabUrl) {
          try {
            tandaTanganBuffer = await readFile(
              getAbsolutePathFromUrl(pembayaran.sekolah.tandaTanganPenanggungJawabUrl)
            )
          } catch (signatureError) {
            console.error('[konfirmasi] Gagal membaca tanda tangan sekolah:', signatureError)
          }
        }
        const suratFilename = `${sanitizeFilename(pembayaran.sekolah.kodePendaftaran)}.pdf`
        const suratUrl = await generateSuratPernyataan({
          namaSekolah: pembayaran.sekolah.namaLengkap,
          kodePendaftaran: pembayaran.sekolah.kodePendaftaran,
          namaPembina: pembayaran.sekolah.namaPembina,
          tanggal: new Date(),
          filename: suratFilename,
          tandaTanganBuffer,
        })
        await prisma.sekolah.update({
          where: { id: pembayaran.sekolahId },
          data: { suratPernyataanUrl: suratUrl },
        })
      } catch (err) {
        console.error('[konfirmasi] Gagal generate Surat Pernyataan:', err)
      }
    }

    // FIX: Gunakan aksi === 'LUNAS', bukan 'DISETUJUI'
    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      aksi === 'LUNAS' ? 'KONFIRMASI_LUNAS' : 'KONFIRMASI_DITOLAK',
      {
        targetType: 'SEKOLAH',
        targetId: pembayaran.sekolahId,
        metadata: {
          targetName: pembayaran.sekolah.namaLengkap,
          kodePendaftaran: pembayaran.sekolah.kodePendaftaran,
          previousStatus: pembayaran.statusPembayaran,
          newStatus: aksi,
          tipePembayaran: pembayaran.tipe,
        },
      }
    )

    return NextResponse.json({
      success: true,
      data: { statusPembayaran: updated.statusPembayaran },
    })
  } catch (error) {
    console.error('[POST /api/pembayaran/:id/konfirmasi]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
