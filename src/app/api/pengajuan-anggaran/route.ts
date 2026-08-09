import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { dataPengajuSchema, itemBarangArraySchema } from '@/lib/validations/pengajuan-anggaran'
import { generateNomorPengajuan } from '@/lib/generate-nomor-pengajuan'
import { generatePdfPengajuanBuffer } from '@/lib/generate-pdf-pengajuan'
import { saveBuffer, saveUploadedFile, getFileExtension } from '@/lib/save-file'
import type { Divisi } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const rawDataPengaju = formData.get('dataPengaju')?.toString()
    const rawItems = formData.get('items')?.toString()

    if (!rawDataPengaju || !rawItems) {
      return NextResponse.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 })
    }

    const parsedPengaju = dataPengajuSchema.safeParse(JSON.parse(rawDataPengaju))
    if (!parsedPengaju.success) {
      return NextResponse.json(
        { success: false, message: 'Data pengaju tidak valid', errors: parsedPengaju.error.flatten() },
        { status: 400 }
      )
    }

    const parsedItems = itemBarangArraySchema.safeParse(JSON.parse(rawItems))
    if (!parsedItems.success) {
      return NextResponse.json(
        { success: false, message: 'Data barang tidak valid', errors: parsedItems.error.flatten() },
        { status: 400 }
      )
    }

    const dataPengaju = parsedPengaju.data
    const itemsRaw = parsedItems.data

    const items = itemsRaw.map((it) => {
      const qty = Number(it.qty)
      const hargaSatuan = Number(it.hargaSatuan)
      return { namaBarang: it.namaBarang, qty, hargaSatuan, total: qty * hargaSatuan }
    })

    const totalJenisBarang = items.length
    const totalKuantitas = items.reduce((s, it) => s + it.qty, 0)
    const totalPengajuan = items.reduce((s, it) => s + it.total, 0)

    const nomorPengajuan = await generateNomorPengajuan()
    const uid = nanoid(10)

    let tandaTanganUrl: string | null = null
    let tandaTanganBuffer: Buffer | null = null

    const tandaTanganFile = formData.get('tandaTangan') as File | null
    if (tandaTanganFile instanceof File && tandaTanganFile.size > 0) {
      const ext = getFileExtension(tandaTanganFile.name) || '.png'
      const filename = `${uid}${ext}`
      tandaTanganUrl = await saveUploadedFile(tandaTanganFile, 'tanda-tangan', filename)
      tandaTanganBuffer = Buffer.from(await tandaTanganFile.arrayBuffer())
    }

    const tanggal = new Date()

    const pdfBuffer = await generatePdfPengajuanBuffer({
      nomorPengajuan,
      tanggal,
      namaKoordinator: dataPengaju.namaKoordinator,
      divisi: dataPengaju.divisi,
      noHp: dataPengaju.noHp,
      items,
      totalJenisBarang,
      totalKuantitas,
      totalPengajuan,
      tandaTanganBuffer,
    })

    const pdfFilename = `${nomorPengajuan.replace(/\s+/g, '_')}.pdf`
    const pdfUrl = await saveBuffer(pdfBuffer, 'pengajuan', pdfFilename)

    const pengajuan = await prisma.pengajuanAnggaran.create({
      data: {
        nomorPengajuan,
        namaKoordinator: dataPengaju.namaKoordinator,
        divisi: dataPengaju.divisi as Divisi,
        noHp: dataPengaju.noHp,
        totalJenisBarang,
        totalKuantitas,
        totalPengajuan,
        tandaTanganUrl,
        pdfUrl,
        items: { create: items },
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Pengajuan berhasil dikirim',
        data: { id: pengajuan.id, nomorPengajuan, pdfUrl },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/pengajuan-anggaran]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}