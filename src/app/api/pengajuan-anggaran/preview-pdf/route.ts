import { NextRequest, NextResponse } from 'next/server'
import { dataPengajuSchema, itemBarangArraySchema } from '@/lib/validations/pengajuan-anggaran'
import { generatePdfPengajuanBuffer } from '@/lib/generate-pdf-pengajuan'

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
      return NextResponse.json({ success: false, message: 'Data pengaju tidak valid' }, { status: 400 })
    }

    const parsedItems = itemBarangArraySchema.safeParse(JSON.parse(rawItems))
    if (!parsedItems.success) {
      return NextResponse.json({ success: false, message: 'Data barang tidak valid' }, { status: 400 })
    }

    const dataPengaju = parsedPengaju.data
    const itemsRaw = parsedItems.data

    const items = itemsRaw.map((it) => {
      const qty = Number(it.qty)
      const hargaSatuan = Number(it.hargaSatuan)
      return { namaBarang: it.namaBarang, qty, hargaSatuan, total: qty * hargaSatuan }
    })

    let tandaTanganBuffer: Buffer | null = null
    const tandaTanganFile = formData.get('tandaTangan') as File | null
    if (tandaTanganFile instanceof File && tandaTanganFile.size > 0) {
      tandaTanganBuffer = Buffer.from(await tandaTanganFile.arrayBuffer())
    }

    const pdfBuffer = await generatePdfPengajuanBuffer({
      nomorPengajuan: 'PREVIEW',
      tanggal: new Date(),
      namaKoordinator: dataPengaju.namaKoordinator,
      divisi: dataPengaju.divisi,
      noHp: dataPengaju.noHp,
      items,
      totalJenisBarang: items.length,
      totalKuantitas: items.reduce((s, it) => s + it.qty, 0),
      totalPengajuan: items.reduce((s, it) => s + it.total, 0),
      tandaTanganBuffer,
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="preview-pengajuan.pdf"',
      },
    })
  } catch (error) {
    console.error('[POST /api/pengajuan-anggaran/preview-pdf]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}