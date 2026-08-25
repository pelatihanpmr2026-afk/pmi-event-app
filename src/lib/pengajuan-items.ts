import { readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { generatePdfPengajuanBuffer } from '@/lib/generate-pdf-pengajuan'
import { saveBuffer, getAbsolutePathFromUrl, deleteFileByUrl } from '@/lib/save-file'

export interface ItemPengajuanUpdate {
  namaBarang: string
  qty: number
  hargaSatuan: number
}

/**
 * Update items pengajuan + hitung ulang total + regenerasi PDF (versi revisi),
 * dalam satu transaksi. Dipakai oleh route admin (PATCH /items) DAN route
 * publik verifikasi no WA (POST /edit) supaya logikanya tidak duplikat.
 *
 * Hanya boleh saat status MENUNGGU. Mengembalikan pengajuan ter-update
 * (termasuk items). PDF lama dihapus setelah sukses.
 */
export async function updatePengajuanItems(
  pengajuanId: string,
  items: ItemPengajuanUpdate[]
) {
  const pengajuan = await prisma.pengajuanAnggaran.findUnique({ where: { id: pengajuanId } })

  if (!pengajuan) {
    throw new NotFoundPengajuanError()
  }

  if (pengajuan.status !== 'MENUNGGU') {
    throw new PengajuanTerkunciError()
  }

  return applyItemsUpdate(pengajuan, items)
}

export class NotFoundPengajuanError extends Error {}
export class PengajuanTerkunciError extends Error {}

async function applyItemsUpdate(
  pengajuan: NonNullable<Awaited<ReturnType<typeof prisma.pengajuanAnggaran.findUnique>>>,
  items: ItemPengajuanUpdate[]
) {
  const itemsDb = items.map((it) => ({
    namaBarang: it.namaBarang,
    qty: it.qty,
    hargaSatuan: it.hargaSatuan,
    total: it.qty * it.hargaSatuan,
  }))
  const totalJenisBarang = itemsDb.length
  const totalKuantitas = itemsDb.reduce((s, it) => s + it.qty, 0)
  const totalPengajuanFinal = itemsDb.reduce((s, it) => s + it.total, 0)

  // Ambil ulang buffer tanda tangan (kalau ada) supaya tetap nempel di PDF hasil edit
  let tandaTanganBuffer: Buffer | null = null
  if (pengajuan.tandaTanganUrl) {
    try {
      tandaTanganBuffer = await readFile(getAbsolutePathFromUrl(pengajuan.tandaTanganUrl))
    } catch {
      tandaTanganBuffer = null
    }
  }

  const pdfBuffer = await generatePdfPengajuanBuffer({
    nomorPengajuan: pengajuan.nomorPengajuan,
    tanggal: pengajuan.createdAt,
    namaKoordinator: pengajuan.namaKoordinator,
    divisi: pengajuan.divisi,
    noHp: pengajuan.noHp,
    items: itemsDb,
    totalJenisBarang,
    totalKuantitas,
    totalPengajuan: totalPengajuanFinal,
    tandaTanganBuffer,
  })

  // Filename unik (bukan menimpa yang lama) — supaya aman dihapus setelahnya tanpa risiko
  // menghapus file yang baru saja ditulis.
  const pdfFilename = `${pengajuan.nomorPengajuan.replace(/\s+/g, '_')}-rev${Date.now()}.pdf`
  const newPdfUrl = await saveBuffer(pdfBuffer, 'pengajuan', pdfFilename)
  const oldPdfUrl = pengajuan.pdfUrl

  const updated = await prisma.$transaction(async (tx) => {
    await tx.pengajuanItem.deleteMany({ where: { pengajuanId: pengajuan.id } })
    await tx.pengajuanItem.createMany({
      data: itemsDb.map((it) => ({ ...it, pengajuanId: pengajuan.id })),
    })

    return tx.pengajuanAnggaran.update({
      where: { id: pengajuan.id },
      data: {
        totalJenisBarang,
        totalKuantitas,
        totalPengajuan: totalPengajuanFinal,
        pdfUrl: newPdfUrl,
      },
      include: { items: true },
    })
  })

  if (oldPdfUrl) {
    await deleteFileByUrl(oldPdfUrl)
  }

  return updated
}