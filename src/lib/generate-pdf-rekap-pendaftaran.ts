import { createCanvas, SKRSContext2D } from '@napi-rs/canvas'
import { registerFonts } from './register-fonts'
import { canvasToA4Pdf, A4_H } from './pdf-a4'

const CANVAS_W = 595
const MARGIN = 20
const NAVY = '#3653A5'
const PINK = '#EC3E96'
const YELLOW = '#FDC20F'
const STRIPE = '#F5F7FB'

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
  ctx.fillStyle = NAVY
  ctx.fillRect(x, y, tableWidth, rowH)
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 1.5
  headers.forEach((h, i) => {
    ctx.strokeRect(colX(i), y, colWidths[i], rowH)
    text(ctx, h, colX(i) + colWidths[i] / 2, y + rowH / 2, 'bold 9px Arial-Bold', '#FFFFFF', 'center')
  })
  y += rowH

  // Body rows
  const bodyRows = rows.length > 0 ? rows : [headers.map(() => '')]
  bodyRows.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 1) {
      ctx.fillStyle = STRIPE
      ctx.fillRect(x, y, tableWidth, rowH)
    }
    row.forEach((cell, i) => {
      ctx.strokeRect(colX(i), y, colWidths[i], rowH)
      if (cell) {
        const leftAligned = i === 1
        const align: CanvasTextAlign = leftAligned ? 'left' : 'center'
        const cellX = leftAligned ? colX(i) + 8 : colX(i) + colWidths[i] / 2
        text(ctx, cell, cellX, y + rowH / 2, '9px Arial', NAVY, align)
      }
    })
    y += rowH
  })

  // Total row
  ctx.fillStyle = YELLOW
  ctx.fillRect(x, y, tableWidth, rowH)
  totalRow.forEach((cell, i) => {
    ctx.strokeRect(colX(i), y, colWidths[i], rowH)
    if (cell) {
      text(ctx, cell, colX(i) + colWidths[i] / 2, y + rowH / 2, 'bold 9px Arial-Bold', NAVY, 'center')
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

  const rowH = 24
  const bodyCount1 = Math.max(pendaftaran.length, 1)
  const bodyCount2 = Math.max(tenda.length, 1)
  const contentH = 116 + rowH + bodyCount1 * rowH + rowH + 40 + 26 + rowH + bodyCount2 * rowH + rowH + 30 + 95 + 30 + 116 + 20
  const HEIGHT = Math.max(Math.ceil(contentH), A4_H)

  const canvas = createCanvas(CANVAS_W, HEIGHT)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, CANVAS_W, HEIGHT)

  // ===== HEADER BAND =====
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, CANVAS_W, 80)
  ctx.fillStyle = PINK
  ctx.fillRect(0, 80, CANVAS_W, 6)
  text(ctx, 'REKAP PENDAFTARAN HARIAN', CANVAS_W / 2, 30, 'bold 19px Arial-Bold', '#FFFFFF', 'center')
  text(ctx, tanggal, CANVAS_W / 2, 58, '11px Arial', YELLOW, 'center')

  let y = 116

  // ===== TABEL 1: PENDAFTARAN =====
  y = drawTable(
    ctx,
    MARGIN,
    y,
    [30, 190, 105, 115, 115],
    ['NO', 'NAMA SEKOLAH', 'JUMLAH PESERTA', 'JUMLAH PENDAMPING', 'TOTAL (RP.)'],
    pendaftaran.map((r, i) => [`${i + 1}`, r.namaSekolah, `${r.jumlahPeserta}`, `${r.jumlahPendamping}`, rp(r.totalRp)]),
    ['', 'TOTAL', `${totals.totalJumlahPeserta}`, `${totals.totalJumlahPendamping}`, rp(totals.totalPendaftaran)],
    rowH
  )

  y += 40

  // ===== TABEL 2: SEWA TENDA =====
  text(ctx, 'REKAP HARIAN SEWA TENDA', CANVAS_W / 2, y, 'bold 13px Arial-Bold', NAVY, 'center')
  y += 26
  y = drawTable(
    ctx,
    MARGIN,
    y,
    [30, 190, 135, 100, 100],
    ['NO', 'NAMA SEKOLAH', 'NAMA TENDA', 'JUMLAH TENDA', 'TOTAL (RP.)'],
    tenda.map((r, i) => [`${i + 1}`, r.namaSekolah, r.namaTenda, `${r.jumlahTenda}`, rp(r.totalRp)]),
    ['', '', 'TOTAL', `${totals.totalJumlahTenda}`, rp(totals.totalSewaTenda)],
    rowH
  )

  y += 30

  // ===== RINGKASAN =====
  const summaryX = CANVAS_W - MARGIN - 280
  const summaryWidth = 280
  const summaryHeight = 90
  ctx.fillStyle = YELLOW
  ctx.fillRect(summaryX, y - 14, summaryWidth, summaryHeight)
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 1.5
  ctx.strokeRect(summaryX, y - 14, summaryWidth, summaryHeight)
  text(ctx, `TOTAL PENDAFTARAN : ${rp(totals.totalPendaftaran)}`, summaryX + 14, y, '10px Arial', NAVY)
  y += 22
  text(ctx, `TOTAL SEWA TENDA : ${rp(totals.totalSewaTenda)}`, summaryX + 14, y, '10px Arial', NAVY)
  y += 22
  text(ctx, `TOTAL : ${rp(totals.totalKeseluruhan)}`, summaryX + 14, y, 'bold 12px Arial-Bold', NAVY)

  y += 56

  // ===== TANDA TANGAN =====
  text(ctx, 'Mengetahui,', summaryX + 140, y, '10px Arial', NAVY, 'center')
  y += 55
  text(ctx, '_______________________', summaryX + 140, y, '10px Arial', '#6B7280', 'center')
  y += 22
  text(ctx, 'Koordinator Kesekretariatan', summaryX + 140, y, 'bold 10px Arial-Bold', NAVY, 'center')

  return canvasToA4Pdf(canvas, `Rekap Pendaftaran ${tanggal}`)
}