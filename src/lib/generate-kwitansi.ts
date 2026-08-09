import path from 'path'
import { createCanvas, loadImage, SKRSContext2D } from '@napi-rs/canvas'
import { registerFonts } from './register-fonts'
import { saveBuffer } from './save-file'
import { PDFDocument } from 'pdf-lib'

const WIDTH = 900
const HEIGHT = 1200
const MARGIN = 50
const NAVY = '#3653A5'
const BLUE = '#1898D5'
const PINK = '#EC3E96'
const YELLOW = '#FDC20F'

export interface KwitansiLineItem {
  label: string
  qty: number
  hargaSatuan: number
  subtotal: number
}

interface GenerateKwitansiParams {
  nomorKwitansi: string
  tipe: 'PESERTA' | 'TENDA'
  namaSekolah: string
  namaPembina: string
  kodePendaftaran: string
  tanggalBayar: Date
  items: KwitansiLineItem[]
  total: number
  qrCodeBuffer: Buffer
  filename: string
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

export async function generateKwitansi({
  nomorKwitansi,
  tipe,
  namaSekolah,
  namaPembina,
  kodePendaftaran,
  tanggalBayar,
  items,
  total,
  qrCodeBuffer,
  filename,
}: GenerateKwitansiParams): Promise<string> {
  registerFonts()

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')

  // Background putih bersih
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // ===== HEADER BAND =====
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, WIDTH, 160)
  ctx.fillStyle = PINK
  ctx.fillRect(0, 160, WIDTH, 8)

  try {
    const logoPmi = await loadImage(path.join(process.cwd(), 'public', 'assets', 'logo-pmi.png'))
    const logoW = 90
    const logoH = (logoPmi.height / logoPmi.width) * logoW
    ctx.drawImage(logoPmi, MARGIN, (160 - logoH) / 2, logoW, logoH)
  } catch {
    // Kalau logo gagal dimuat, kwitansi tetap digenerate tanpa logo (tidak menggagalkan proses)
  }

  drawText(ctx, 'KWITANSI PEMBAYARAN', WIDTH / 2, 65, {
    font: '32px Silkscreen-Bold',
    color: '#FFFFFF',
    align: 'center',
  })
  drawText(ctx, `Pelantikan & Pelatihan PMR Se-Kabupaten Cianjur 2026`, WIDTH / 2, 105, {
    font: '16px Silkscreen',
    color: '#FFFFFF',
    align: 'center',
  })
drawText(ctx, tipe === 'PESERTA' ? 'BIAYA PESERTA & PENDAMPING' : 'BIAYA SEWA TENDA', WIDTH / 2, 135, {
    font: 'bold 16px Silkscreen-Bold',
    color: YELLOW,
    align: 'center',
  })

  // ===== BADGE STATUS =====
  const badgeText = 'MENUNGGU KONFIRMASI PANITIA'
  const badgeH = 42
  const badgeY = 178
  ctx.font = 'bold 15px Silkscreen-Bold'
  const badgeW = ctx.measureText(badgeText).width + 48
  const badgeX = WIDTH / 2 - badgeW / 2

  ctx.fillStyle = YELLOW
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH)
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 3
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH)
  drawText(ctx, badgeText, WIDTH / 2, badgeY + badgeH / 2, {
    font: 'bold 15px Silkscreen-Bold',
    color: NAVY,
    align: 'center',
  })

  // ===== INFO BOX =====
  let y = 250

 const infoRows: [string, string][] = [
  ['No. Kwitansi', nomorKwitansi],
  ['Kode Pendaftaran', kodePendaftaran],
  ['Nama Sekolah', namaSekolah],
  ['Pembina/Pelatih', namaPembina],
  [
    'Tanggal Bayar',
    tanggalBayar.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
  ],
]

  ctx.strokeStyle = NAVY
  ctx.lineWidth = 3
  ctx.strokeRect(MARGIN, y, WIDTH - MARGIN * 2, infoRows.length * 42 + 20)

  y += 32
  for (const [label, value] of infoRows) {
    drawText(ctx, label, MARGIN + 24, y, { font: '15px Silkscreen', color: '#6B7280' })
    drawText(ctx, value, WIDTH - MARGIN - 24, y, {
      font: 'bold 16px Silkscreen-Bold',
      color: NAVY,
      align: 'right',
    })
    y += 42
  }

  // ===== TABEL RINCIAN =====
  y += 40
  const tableTop = y
  const col = { label: MARGIN + 20, qty: 520, harga: 620, subtotal: WIDTH - MARGIN - 20 }

  ctx.fillStyle = NAVY
  ctx.fillRect(MARGIN, y, WIDTH - MARGIN * 2, 44)
  drawText(ctx, 'RINCIAN', col.label, y + 22, { font: 'bold 14px Silkscreen-Bold', color: '#FFFFFF' })
  drawText(ctx, 'QTY', col.qty, y + 22, { font: 'bold 14px Silkscreen-Bold', color: '#FFFFFF', align: 'center' })
  drawText(ctx, 'HARGA', col.harga, y + 22, { font: 'bold 14px Silkscreen-Bold', color: '#FFFFFF', align: 'right' })
  drawText(ctx, 'SUBTOTAL', col.subtotal, y + 22, {
    font: 'bold 14px Silkscreen-Bold',
    color: '#FFFFFF',
    align: 'right',
  })
  y += 44

  items.forEach((item, i) => {
    const rowH = 48
    if (i % 2 === 1) {
      ctx.fillStyle = '#F5F7FB'
      ctx.fillRect(MARGIN, y, WIDTH - MARGIN * 2, rowH)
    }
    drawText(ctx, item.label, col.label, y + rowH / 2, { font: '15px Silkscreen', color: NAVY })
    drawText(ctx, `${item.qty}`, col.qty, y + rowH / 2, { font: '15px Silkscreen', color: NAVY, align: 'center' })
    drawText(ctx, formatRupiah(item.hargaSatuan), col.harga, y + rowH / 2, {
      font: '15px Silkscreen',
      color: NAVY,
      align: 'right',
    })
    drawText(ctx, formatRupiah(item.subtotal), col.subtotal, y + rowH / 2, {
      font: 'bold 15px Silkscreen-Bold',
      color: NAVY,
      align: 'right',
    })
    y += rowH
  })

  ctx.strokeStyle = NAVY
  ctx.lineWidth = 3
  ctx.strokeRect(MARGIN, tableTop, WIDTH - MARGIN * 2, y - tableTop)

  // ===== TOTAL =====
  y += 10
  ctx.fillStyle = YELLOW
  ctx.fillRect(MARGIN, y, WIDTH - MARGIN * 2, 60)
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 3
  ctx.strokeRect(MARGIN, y, WIDTH - MARGIN * 2, 60)
  drawText(ctx, 'TOTAL PEMBAYARAN', col.label, y + 30, { font: 'bold 18px Silkscreen-Bold', color: NAVY })
  drawText(ctx, formatRupiah(total), col.subtotal, y + 30, {
    font: 'bold 22px Silkscreen-Bold',
    color: NAVY,
    align: 'right',
  })
  y += 90

  // ===== QR CODE =====
  const qrImg = await loadImage(qrCodeBuffer)
  const qrSize = 180
  const qrX = WIDTH / 2 - qrSize / 2
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 3
  ctx.strokeRect(qrX - 10, y - 10, qrSize + 20, qrSize + 20)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(qrImg, qrX, y, qrSize, qrSize)
  y += qrSize + 30

drawText(ctx, 'Scan untuk cek status konfirmasi terkini', WIDTH / 2, y, {
    font: 'bold 14px Silkscreen-Bold',
    color: NAVY,
    align: 'center',
  })
  drawText(
    ctx,
    tipe === 'PESERTA'
      ? 'QR ini juga dipakai untuk daftar ulang di lokasi'
      : 'QR ini bukti keaslian kwitansi sewa tenda',
    WIDTH / 2,
    y + 24,
    { font: '13px Silkscreen', color: '#6B7280', align: 'center' }
  )

  // ===== FOOTER =====
  const footerY = HEIGHT - 70
  ctx.strokeStyle = '#E5E7EB'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(MARGIN, footerY - 20)
  ctx.lineTo(WIDTH - MARGIN, footerY - 20)
  ctx.stroke()

  drawText(
    ctx,
    'Dokumen ini digenerate otomatis oleh sistem dan sah tanpa tanda tangan basah.',
    WIDTH / 2,
    footerY + 10,
    { font: '12px Silkscreen', color: '#9CA3AF', align: 'center' }
  )
  drawText(
    ctx,
    `Dicetak: ${new Date().toLocaleString('id-ID')}`,
    WIDTH / 2,
    footerY + 32,
    { font: '11px Silkscreen', color: '#9CA3AF', align: 'center' }
  )

// Render canvas jadi PNG dulu, lalu bungkus ke dalam halaman PDF berukuran sama
  // supaya desain pixel-art-nya tetap presisi (tidak di-reflow oleh renderer PDF).
  const pngBuffer = canvas.toBuffer('image/png')

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(`Kwitansi ${nomorKwitansi}`)
  pdfDoc.setSubject('Kwitansi Pembayaran Pelantikan & Pelatihan PMR 2026')
  pdfDoc.setProducer('Sistem Pendaftaran PMR 2026')
  pdfDoc.setCreationDate(new Date())

  const pngImage = await pdfDoc.embedPng(pngBuffer)
  const page = pdfDoc.addPage([WIDTH, HEIGHT])
  page.drawImage(pngImage, { x: 0, y: 0, width: WIDTH, height: HEIGHT })

  const pdfBytes = await pdfDoc.save()

  return saveBuffer(Buffer.from(pdfBytes), 'kwitansi', filename)
}