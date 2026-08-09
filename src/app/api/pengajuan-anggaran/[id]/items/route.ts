import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { editItemsApiSchema } from '@/lib/validations/pengajuan-anggaran'
import { generatePdfPengajuanBuffer } from '@/lib/generate-pdf-pengajuan'
import { saveBuffer, getAbsolutePathFromUrl, deleteFileByUrl } from '@/lib/save-file'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = editItemsApiSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const pengajuan = await prisma.pengajuanAnggaran.findUnique({ where: { id } })

    if (!pengajuan) {
      return NextResponse.json({ success: false, message: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    if (pengajuan.status !== 'MENUNGGU') {
      return NextResponse.json(
        { success: false, message: 'Pengajuan yang sudah diproses tidak bisa diedit lagi' },
        { status: 409 }
      )
    }

    const items = parsed.data.items.map((it) => ({
      namaBarang: it.namaBarang,
      qty: it.qty,
      hargaSatuan: it.hargaSatuan,
      total: it.qty * it.hargaSatuan,
    }))

    const totalJenisBarang = items.length
    const totalKuantitas = items.reduce((s, it) => s + it.qty, 0)
    const totalPengajuan = items.reduce((s, it) => s + it.total, 0)

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
      items,
      totalJenisBarang,
      totalKuantitas,
      totalPengajuan,
      tandaTanganBuffer,
    })

    // Filename unik (bukan menimpa yang lama) — supaya aman dihapus setelahnya tanpa risiko
    // menghapus file yang baru saja ditulis.
    const pdfFilename = `${pengajuan.nomorPengajuan.replace(/\s+/g, '_')}-rev${Date.now()}.pdf`
    const newPdfUrl = await saveBuffer(pdfBuffer, 'pengajuan', pdfFilename)
    const oldPdfUrl = pengajuan.pdfUrl

    const updated = await prisma.$transaction(async (tx) => {
      await tx.pengajuanItem.deleteMany({ where: { pengajuanId: id } })
      await tx.pengajuanItem.createMany({
        data: items.map((it) => ({ ...it, pengajuanId: id })),
      })

      return tx.pengajuanAnggaran.update({
        where: { id },
        data: {
          totalJenisBarang,
          totalKuantitas,
          totalPengajuan,
          pdfUrl: newPdfUrl,
          status: 'DISETUJUI',
          catatanAdmin: null,
          diprosesPada: new Date(),
        },
        include: { items: true },
      })
    })

    if (oldPdfUrl) {
      await deleteFileByUrl(oldPdfUrl)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[PATCH /api/pengajuan-anggaran/:id/items]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}