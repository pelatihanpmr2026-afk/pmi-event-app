import { createCanvas, SKRSContext2D } from '@napi-rs/canvas'
import { PDFDocument } from 'pdf-lib'
import { registerFonts } from './register-fonts'

const WIDTH = 900
const MARGIN = 40
const BLACK = '#111111'

interface PendaftaranRow { namaSekolah: string; jumlahPeserta: number; jumlahPendamping: number; totalRp: number }
interface TendaRow { namaSekolah: string; namaTenda: string; jumlahTenda: number; totalRp: number }

function rp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

function text(ctx: SKRSContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(s, x, y)
}

function drawTable(
  ctx: SKRSContext2D,
  x: number,
  yStart: number,
  colWidths: number[],
  headers: string[],
  rows: string[][],
  totalRow: string[],
  rowH: number
): number {
  const tableWidth = colWidths.reduce((a, b) => a + b, 0)
  let y = yStart

  function colX(i: number) {
    return x + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
  }

  // Header
  ctx.strokeStyle = BLACK
  ctx.lineWidth = 1.5
  headers.forEach((h, i) => {
    ctx.strokeRect(colX(i), y, colWidths[i], rowH)
    text(ctx, h, colX(i) + colWidths[i] / 2, y + rowH / 2, 'bold 12px Silkscreen-Bold', BLACK, 'center')
  })
  y += rowH

  // Body rows (kosong pun tetap gambar minimal 1 baris kosong biar ada ruang tulis manual)
  const bodyRows = rows.length > 0 ? rows : [headers.map(() => '')]
  bodyRows.forEach((row) => {
    row.forEach((cell, i) => {
      ctx.strokeRect(colX(i), y, colWidths[i], rowH)
      if (cell) {
        const align: CanvasTextAlign = i === 1 ? 'left' : 'center'
        const cellX = align === 'left' ? colX(i) + 10 : colX(i) + colWidths[i] / 2
        text(ctx, cell, cellX, y + rowH / 2, '11px Silkscreen', BLACK, align)
      }
    })
    y += rowH
  })

  // Total row
  totalRow.forEach((cell, i) => {
    ctx.strokeRect(colX(i), y, colWidths[i], rowH)
    if (cell) {
      text(ctx, cell, colX(i) + colWidths[i] / 2, y + rowH / 2, 'bold 12px Silkscreen-Bold', BLACK, 'center')
    }
  })
  y += rowH

  return y
}

export async function generatePdfRekapPendaftaran(
  tanggal: string,
  pendaftaran: PendaftaranRow[],
  tenda: TendaRow[],
  totals: {
    totalJumlahPeserta: number
    totalJumlahPendamping: number
    totalJumlahTenda: number
    totalPendaftaran: number
    totalSewaTenda: number
    totalKeseluruhan: number
  }
): Promise<Buffer> {
  registerFonts()

  const rowH = 34
  const bodyCount1 = Math.max(pendaftaran.length, 1)
  const bodyCount2 = Math.max(tenda.length, 1)
  const HEIGHT = 90 + (bodyCount1 + 2) * rowH + 70 + (bodyCount2 + 2) * rowH + 230

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  let y = 45
  text(ctx, 'REKAP PENDAFTARAN HARIAN', WIDTH / 2, y, 'bold 20px Silkscreen-Bold', BLACK, 'center')
  y += 22
  text(ctx, tanggal, WIDTH / 2, y, '12px Silkscreen', '#6B7280', 'center')
  y += 35

  // ===== TABEL 1: PENDAFTARAN =====
  const col1 = [50, 300, 160, 180, 160]
  y = drawTable(
    ctx,
    MARGIN,
    y,
    col1,
    ['NO', 'NAMA SEKOLAH', 'JUMLAH PESERTA', 'JUMLAH PENDAMPING', 'TOTAL (RP.)'],
    pendaftaran.map((r, i) => [`${i + 1}`, r.namaSekolah, `${r.jumlahPeserta}`, `${r.jumlahPendamping}`, rp(r.totalRp)]),
    ['', 'TOTAL', `${totals.totalJumlahPeserta}`, `${totals.totalJumlahPendamping}`, rp(totals.totalPendaftaran)],
    rowH
  )

  y += 40

  // ===== TABEL 2: SEWA TENDA =====
  text(ctx, 'REKAP PENDAFTARAN HARIAN', WIDTH / 2, y, 'bold 20px Silkscreen-Bold', BLACK, 'center')
  y += 35

  const col2 = [50, 300, 200, 150, 150]
  y = drawTable(
    ctx,
    MARGIN,
    y,
    col2,
    ['NO', 'NAMA SEKOLAH', 'NAMA TENDA', 'JUMLAH TENDA', 'TOTAL (RP.)'],
    tenda.map((r, i) => [`${i + 1}`, r.namaSekolah, r.namaTenda, `${r.jumlahTenda}`, rp(r.totalRp)]),
    ['', '', 'TOTAL', `${totals.totalJumlahTenda}`, rp(totals.totalSewaTenda)],
    rowH
  )

  y += 40

  // ===== SUMMARY (kanan bawah, polos) =====
  const summaryX = WIDTH - MARGIN - 280
  text(ctx, `TOTAL PENDAFTARAN : ${rp(totals.totalPendaftaran)}`, summaryX, y, '13px Silkscreen', BLACK)
  y += 24
  text(ctx, `TOTAL SEWA TENDA : ${rp(totals.totalSewaTenda)}`, summaryX, y, '13px Silkscreen', BLACK)
  y += 24
  text(ctx, `TOTAL : ${rp(totals.totalKeseluruhan)}`, summaryX, y, 'bold 14px Silkscreen-Bold', BLACK)

  y += 60

  // ===== TANDA TANGAN =====
  text(ctx, 'Mengetahui,', summaryX + 140, y, '13px Silkscreen', BLACK, 'center')
  y += 90
  text(ctx, '_______________________', summaryX + 140, y, '13px Silkscreen', BLACK, 'center')
  y += 24
  text(ctx, 'Koordinator Kesekretariatan', summaryX + 140, y, 'bold 12px Silkscreen-Bold', BLACK, 'center')

  const pngBuffer = canvas.toBuffer('image/png')
  const pdfDoc = await PDFDocument.create()
  const img = await pdfDoc.embedPng(pngBuffer)
  const page = pdfDoc.addPage([WIDTH, HEIGHT])
  page.drawImage(img, { x: 0, y: 0, width: WIDTH, height: HEIGHT })
  const bytes = await pdfDoc.save()
  return Buffer.from(bytes)
}