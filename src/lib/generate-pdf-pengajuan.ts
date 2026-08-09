import path from 'path'
import { createCanvas, loadImage, SKRSContext2D } from '@napi-rs/canvas'
import { PDFDocument } from 'pdf-lib'
import { registerFonts } from './register-fonts'
import { DIVISI_OPTIONS } from './constants'

const WIDTH = 900
const MARGIN = 50
const NAVY = '#3653A5'
const PINK = '#EC3E96'
const YELLOW = '#FDC20F'

interface ItemLine {
  namaBarang: string
  qty: number
  hargaSatuan: number
  total: number
}

interface GeneratePdfPengajuanParams {
  nomorPengajuan: string
  tanggal: Date
  namaKoordinator: string
  divisi: string
  noHp: string
  items: ItemLine[]
  totalJenisBarang: number
  totalKuantitas: number
  totalPengajuan: number
  tandaTanganBuffer?: Buffer | null
}

function formatRupiah(n: number): string {
  return `Rp${n.toLocaleString('id-ID')}`
}

function drawText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  opts: { font: string; color: string; align?: CanvasTextAlign }
) {
  ctx.font = opts.font
  ctx.fillStyle = opts.color
  ctx.textAlign = opts.align ?? 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

function findDivisiLabel(value: string): string {
  return DIVISI_OPTIONS.find((d) => d.value === value)?.label ?? value
}

export async function generatePdfPengajuanBuffer(params: GeneratePdfPengajuanParams): Promise<Buffer> {
  registerFonts()

  const rowHeight = 44
  const headerHeight = 140
  const infoHeight = 4 * 34 + 20
  const tableHeaderHeight = 40
  const tableHeight = tableHeaderHeight + params.items.length * rowHeight
  const totalsHeight = 110
  const signatureHeight = 190
  const footerHeight = 70
  const spacing = 220 // jarak antar section

  const HEIGHT =
    headerHeight + infoHeight + tableHeight + totalsHeight + signatureHeight + footerHeight + spacing + MARGIN * 2

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // ===== HEADER =====
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, WIDTH, headerHeight)
  ctx.fillStyle = PINK
  ctx.fillRect(0, headerHeight, WIDTH, 8)

  try {
    const logo = await loadImage(path.join(process.cwd(), 'public', 'assets', 'logo-pmi.png'))
    const logoW = 80
    const logoH = (logo.height / logo.width) * logoW
    ctx.drawImage(logo, MARGIN, (headerHeight - logoH) / 2, logoW, logoH)
  } catch {
    // Logo opsional — kalau gagal dimuat, PDF tetap digenerate tanpa logo
  }

  drawText(ctx, 'FORM PENGAJUAN ANGGARAN', WIDTH / 2, 55, {
    font: '28px Silkscreen-Bold',
    color: '#FFFFFF',
    align: 'center',
  })
  drawText(ctx, 'Pelantikan & Pelatihan PMR Se-Kabupaten Cianjur 2026', WIDTH / 2, 95, {
    font: '15px Silkscreen',
    color: '#FFFFFF',
    align: 'center',
  })
  drawText(ctx, params.nomorPengajuan, WIDTH / 2, 122, {
    font: 'bold 15px Silkscreen-Bold',
    color: YELLOW,
    align: 'center',
  })

  let y = headerHeight + 40

    const infoRows: [string, string][] = [
    ['Nama Divisi', findDivisiLabel(params.divisi)],
    ['Penanggung Jawab', params.namaKoordinator],
    ['Nomor HP', params.noHp],
    [
      'Tanggal Pengajuan',
      params.tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    ],
  ]

  ctx.strokeStyle = NAVY
  ctx.lineWidth = 3
  ctx.strokeRect(MARGIN, y, WIDTH - MARGIN * 2, infoRows.length * 34 + 20)
  y += 30
  for (const [label, value] of infoRows) {
    drawText(ctx, label, MARGIN + 24, y, { font: '14px Silkscreen', color: '#6B7280' })
    drawText(ctx, value, WIDTH - MARGIN - 24, y, { font: 'bold 15px Silkscreen-Bold', color: NAVY, align: 'right' })
    y += 34
  }

  y += 40

  // ===== TABEL RINCIAN =====
  const tableTop = y
  const col = { no: MARGIN + 20, nama: MARGIN + 60, qty: 560, harga: 660, total: WIDTH - MARGIN - 20 }

  ctx.fillStyle = NAVY
  ctx.fillRect(MARGIN, y, WIDTH - MARGIN * 2, tableHeaderHeight)
  drawText(ctx, 'NO', col.no, y + tableHeaderHeight / 2, { font: 'bold 13px Silkscreen-Bold', color: '#FFFFFF' })
  drawText(ctx, 'NAMA BARANG/KEBUTUHAN', col.nama, y + tableHeaderHeight / 2, {
    font: 'bold 13px Silkscreen-Bold',
    color: '#FFFFFF',
  })
  drawText(ctx, 'QTY', col.qty, y + tableHeaderHeight / 2, {
    font: 'bold 13px Silkscreen-Bold',
    color: '#FFFFFF',
    align: 'center',
  })
  drawText(ctx, 'HARGA SATUAN', col.harga, y + tableHeaderHeight / 2, {
    font: 'bold 13px Silkscreen-Bold',
    color: '#FFFFFF',
    align: 'right',
  })
  drawText(ctx, 'TOTAL', col.total, y + tableHeaderHeight / 2, {
    font: 'bold 13px Silkscreen-Bold',
    color: '#FFFFFF',
    align: 'right',
  })
  y += tableHeaderHeight

  params.items.forEach((item, i) => {
    if (i % 2 === 1) {
      ctx.fillStyle = '#F5F7FB'
      ctx.fillRect(MARGIN, y, WIDTH - MARGIN * 2, rowHeight)
    }
    drawText(ctx, `${i + 1}`, col.no, y + rowHeight / 2, { font: '14px Silkscreen', color: NAVY })
    drawText(ctx, item.namaBarang, col.nama, y + rowHeight / 2, { font: '14px Silkscreen', color: NAVY })
    drawText(ctx, `${item.qty}`, col.qty, y + rowHeight / 2, { font: '14px Silkscreen', color: NAVY, align: 'center' })
    drawText(ctx, formatRupiah(item.hargaSatuan), col.harga, y + rowHeight / 2, {
      font: '14px Silkscreen',
      color: NAVY,
      align: 'right',
    })
    drawText(ctx, formatRupiah(item.total), col.total, y + rowHeight / 2, {
      font: 'bold 14px Silkscreen-Bold',
      color: NAVY,
      align: 'right',
    })
    y += rowHeight
  })

  ctx.strokeStyle = NAVY
  ctx.lineWidth = 3
  ctx.strokeRect(MARGIN, tableTop, WIDTH - MARGIN * 2, y - tableTop)

  y += 30

  // ===== TOTALS =====
  ctx.fillStyle = YELLOW
  ctx.fillRect(MARGIN, y, WIDTH - MARGIN * 2, totalsHeight)
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 3
  ctx.strokeRect(MARGIN, y, WIDTH - MARGIN * 2, totalsHeight)

  const totalsRows: [string, string][] = [
    ['Total Jenis Barang/Kebutuhan', `${params.totalJenisBarang}`],
    ['Total Kuantitas', `${params.totalKuantitas}`],
    ['TOTAL PENGAJUAN', formatRupiah(params.totalPengajuan)],
  ]

  let ty = y + 28
  totalsRows.forEach(([label, value], i) => {
    const isLast = i === totalsRows.length - 1
    drawText(ctx, label, MARGIN + 24, ty, {
      font: isLast ? 'bold 17px Silkscreen-Bold' : '14px Silkscreen',
      color: NAVY,
    })
    drawText(ctx, value, WIDTH - MARGIN - 24, ty, {
      font: isLast ? 'bold 20px Silkscreen-Bold' : 'bold 15px Silkscreen-Bold',
      color: NAVY,
      align: 'right',
    })
    ty += isLast ? 36 : 27
  })

  y += totalsHeight + 50

  // ===== TANDA TANGAN (1 kolom, rata kanan) =====
  const sigBlockWidth = 280
  const sigX = WIDTH - MARGIN - sigBlockWidth

  drawText(ctx, 'Mengetahui,', sigX + sigBlockWidth / 2, y, {
    font: '15px Silkscreen',
    color: NAVY,
    align: 'center',
  })
  y += 30

  const boxY = y
  const boxH = 100
  if (params.tandaTanganBuffer) {
    try {
      const sigImg = await loadImage(params.tandaTanganBuffer)
      const maxW = sigBlockWidth - 40
      const maxH = boxH
      const ratio = Math.min(maxW / sigImg.width, maxH / sigImg.height)
      const dw = sigImg.width * ratio
      const dh = sigImg.height * ratio
      ctx.drawImage(sigImg, sigX + 20 + (maxW - dw) / 2, boxY + (maxH - dh) / 2, dw, dh)
    } catch {
      // Kalau gambar tanda tangan gagal dimuat, tetap lanjut tanpa itu (kosong seperti manual)
    }
  }

  y += boxH + 15
  drawText(ctx, '( _______________________ )', sigX + sigBlockWidth / 2, y, {
    font: '14px Silkscreen',
    color: '#6B7280',
    align: 'center',
  })
  y += 26
  drawText(ctx, 'Koordinator / Penanggung Jawab', sigX + sigBlockWidth / 2, y, {
    font: 'bold 13px Silkscreen-Bold',
    color: NAVY,
    align: 'center',
  })

  y += 60

  // ===== FOOTER =====
  ctx.strokeStyle = '#E5E7EB'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(MARGIN, y)
  ctx.lineTo(WIDTH - MARGIN, y)
  ctx.stroke()
  y += 30
  drawText(ctx, 'Dokumen ini digenerate otomatis oleh sistem.', WIDTH / 2, y, {
    font: '12px Silkscreen',
    color: '#9CA3AF',
    align: 'center',
  })

  const pngBuffer = canvas.toBuffer('image/png')

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(`Pengajuan Anggaran ${params.nomorPengajuan}`)
  const pngImage = await pdfDoc.embedPng(pngBuffer)
  const page = pdfDoc.addPage([WIDTH, HEIGHT])
  page.drawImage(pngImage, { x: 0, y: 0, width: WIDTH, height: HEIGHT })
  const pdfBytes = await pdfDoc.save()

  return Buffer.from(pdfBytes)
}