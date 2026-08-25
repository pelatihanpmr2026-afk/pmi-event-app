import { readFile } from 'fs/promises'
import { generatePdfPengajuanBuffer } from '@/lib/generate-pdf-pengajuan'
import { getAbsolutePathFromUrl } from '@/lib/save-file'
import type { Prisma } from '@prisma/client'

type PengajuanWithItems = Prisma.PengajuanAnggaranGetPayload<{ include: { items: true } }>

/**
 * Regenerasi PDF pengajuan dari data terkini. Dipakai route download PDF,
 * route proses (untuk lampiran WhatsApp) dan update items supaya logika
 * generate PDF tidak diduplikasi.
 */
export async function buildPengajuanPdfBuffer(pengajuan: PengajuanWithItems): Promise<Buffer> {
  let tandaTanganBuffer: Buffer | null = null
  if (pengajuan.tandaTanganUrl) {
    try {
      tandaTanganBuffer = await readFile(getAbsolutePathFromUrl(pengajuan.tandaTanganUrl))
    } catch {
      tandaTanganBuffer = null
    }
  }

  return generatePdfPengajuanBuffer({
    nomorPengajuan: pengajuan.nomorPengajuan,
    tanggal: pengajuan.createdAt,
    namaKoordinator: pengajuan.namaKoordinator,
    divisi: pengajuan.divisi,
    noHp: pengajuan.noHp,
    items: pengajuan.items,
    totalJenisBarang: pengajuan.totalJenisBarang,
    totalKuantitas: pengajuan.totalKuantitas,
    totalPengajuan: pengajuan.totalPengajuan,
    tandaTanganBuffer,
  })
}