import { createCanvas, SKRSContext2D } from '@napi-rs/canvas'
import { registerFonts } from './register-fonts'
import { canvasToA4Pdf, A4_H } from './pdf-a4'

const CANVAS_W = 595
const MARGIN = 20
const NAVY = '#3653A5'
const YELLOW = '#FDC20F'
const STRIPE = '#F5F7FB'

interface Row { keterangan: string; uraian: string; debit: number; kredit: number; utang: number }

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

export async function generatePdfRekapHarianKeuangan(
  tanggal: string,
  rows: Row[],
  totals: { totalDebit: number; totalKredit: number; totalUtang: number }
): Promise<Buffer> {
  registerFonts()

  const COLS = [30, 130, 170, 75, 75, 75]
  const colX = (i: number) => MARGIN + COLS.slice(0, i).reduce((a, b) => a + b, 0)
  const TABLE_W = COLS.reduce((a, b) => a + b, 0)
  const rowH = 24
  const bodyCount = Math.max(rows.length, 1)
  const contentH = 116 + rowH + bodyCount * rowH + 30 + 90 + 20
  const HEIGHT = Math.max(Math.ceil(contentH), A4_H)

  const canvas = createCanvas(CANVAS_W, HEIGHT)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, CANVAS_W, HEIGHT)

  // ===== HEADER BAND =====
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, CANVAS_W, 80)
  text(ctx, 'REKAP KEUANGAN HARIAN', CANVAS_W / 2, 30, 'bold 19px Arial-Bold', '#FFFFFF', 'center')
  text(ctx, tanggal, CANVAS_W / 2, 58, '11px Arial', YELLOW, 'center')

  let y = 116

  // ===== HEADER TABEL =====
  ctx.fillStyle = NAVY
  ctx.fillRect(MARGIN, y, TABLE_W, rowH)
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 1.5
  ;['NO', 'KETERANGAN', 'URAIAN', 'DEBIT', 'KREDIT', 'UTANG'].forEach((h, i) => {
    ctx.strokeRect(colX(i), y, COLS[i], rowH)
    text(ctx, h, colX(i) + COLS[i] / 2, y + rowH / 2, 'bold 9px Arial-Bold', '#FFFFFF', 'center')
  })
  y += rowH

  // ===== BODY =====
  if (rows.length === 0) {
    ctx.strokeRect(MARGIN, y, TABLE_W, rowH)
    text(ctx, 'Tidak ada transaksi di tanggal ini', MARGIN + 10, y + rowH / 2, '10px Arial', NAVY)
    y += rowH
  } else {
    rows.forEach((r, i) => {
      if (i % 2 === 1) {
        ctx.fillStyle = STRIPE
        ctx.fillRect(MARGIN, y, TABLE_W, rowH)
      }
      ctx.strokeStyle = NAVY
      ctx.lineWidth = 1.5
      ;[0, 1, 2, 3, 4, 5].forEach((c) => ctx.strokeRect(colX(c), y, COLS[c], rowH))
      text(ctx, `${i + 1}`, colX(0) + COLS[0] / 2, y + rowH / 2, '10px Arial', NAVY, 'center')
      text(ctx, r.keterangan.slice(0, 26), colX(1) + 8, y + rowH / 2, '9px Arial', NAVY)
      text(ctx, r.uraian.slice(0, 34), colX(2) + 8, y + rowH / 2, '9px Arial', NAVY)
      text(ctx, r.debit ? rp(r.debit) : '-', colX(3) + COLS[3] - 8, y + rowH / 2, '9px Arial', NAVY, 'right')
      text(ctx, r.kredit ? rp(r.kredit) : '-', colX(4) + COLS[4] - 8, y + rowH / 2, '9px Arial', NAVY, 'right')
      text(ctx, r.utang ? rp(r.utang) : '-', colX(5) + COLS[5] - 8, y + rowH / 2, '9px Arial', NAVY, 'right')
      y += rowH
    })
  }

  y += 30

  // ===== RINGKASAN =====
  const boxW = 270
  const boxH = 82
  const boxX = CANVAS_W - MARGIN - boxW
  ctx.fillStyle = YELLOW
  ctx.fillRect(boxX, y - 6, boxW, boxH)
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 1.5
  ctx.strokeRect(boxX, y - 6, boxW, boxH)
  text(ctx, `Total Debit : ${rp(totals.totalDebit)}`, boxX + 14, y + 12, '10px Arial', NAVY)
  text(ctx, `Total Kredit : ${rp(totals.totalKredit)}`, boxX + 14, y + 36, '10px Arial', NAVY)
  text(ctx, `Total Utang : ${rp(totals.totalUtang)}`, boxX + 14, y + 60, 'bold 11px Arial-Bold', NAVY)

  return canvasToA4Pdf(canvas, `Rekap Keuangan Harian ${tanggal}`)
}