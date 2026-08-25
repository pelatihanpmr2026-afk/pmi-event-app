import { createCanvas, SKRSContext2D } from '@napi-rs/canvas'
import { registerFonts } from './register-fonts'
import { canvasToA4Pdf, A4_H } from './pdf-a4'

const CANVAS_W = 595
const MARGIN = 20
const TABLE_W = CANVAS_W - MARGIN * 2
const NAVY = '#3653A5'
const PINK = '#EC3E96'
const YELLOW = '#FDC20F'
const MUTED = '#6B7280'
const STRIPE = '#F5F7FB'

interface TendaRow {
  no: number
  namaSekolah: string
  tenda: { nama: string; jumlah: number }[]
  totalUnit: number
}

function text(ctx: SKRSContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(s, x, y)
}

export async function generatePdfRekapTenda(tanggal: string, rows: TendaRow[]): Promise<Buffer> {
  registerFonts()

  const COLS = [30, 200, 245, 80]
  const colX = (i: number) => MARGIN + COLS.slice(0, i).reduce((a, b) => a + b, 0)
  const headerH = 26
  const LINE_H = 14

  function rowHFor(r: TendaRow) {
    return r.tenda.length > 1 ? r.tenda.length * LINE_H + 8 : 26
  }

  const bodyH = rows.length > 0 ? rows.reduce((sum, r) => sum + rowHFor(r), 0) : 26
  const contentH = 116 + headerH + bodyH + 40 + 116 + 20
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
  text(ctx, 'REKAP HARIAN SEWA TENDA', CANVAS_W / 2, 30, 'bold 19px Arial-Bold', '#FFFFFF', 'center')
  text(ctx, tanggal, CANVAS_W / 2, 58, '11px Arial', YELLOW, 'center')

  let y = 116

  // ===== HEADER TABEL =====
  ctx.fillStyle = NAVY
  ctx.fillRect(MARGIN, y, TABLE_W, headerH)
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 1.5
  ;['NO', 'NAMA SEKOLAH', 'JENIS TENDA YANG DISEWA', 'QTY'].forEach((h, i) => {
    ctx.strokeRect(colX(i), y, COLS[i], headerH)
    text(ctx, h, colX(i) + COLS[i] / 2, y + headerH / 2, 'bold 9px Arial-Bold', '#FFFFFF', 'center')
  })
  y += headerH

  // ===== BODY =====
  if (rows.length === 0) {
    ctx.strokeRect(MARGIN, y, TABLE_W, headerH)
    text(ctx, 'Tidak ada sewa tenda di tanggal ini', MARGIN + 10, y + headerH / 2, '10px Arial', NAVY)
    y += headerH
  } else {
    rows.forEach((r, ri) => {
      const rowH = rowHFor(r)
      const lines = r.tenda.map((t) => `${t.nama} x ${t.jumlah}`)
      if (ri % 2 === 1) {
        ctx.fillStyle = STRIPE
        ctx.fillRect(MARGIN, y, TABLE_W, rowH)
      }
      ctx.strokeStyle = NAVY
      ctx.lineWidth = 1.5
      ;[0, 1, 2, 3].forEach((i) => ctx.strokeRect(colX(i), y, COLS[i], rowH))

      text(ctx, `${r.no}`, colX(0) + COLS[0] / 2, y + rowH / 2, '10px Arial', NAVY, 'center')
      text(ctx, r.namaSekolah, colX(1) + 8, y + rowH / 2, '10px Arial', NAVY)
      if (lines.length === 1) {
        text(ctx, lines[0], colX(2) + 8, y + rowH / 2, '10px Arial', NAVY)
      } else {
        lines.forEach((ln, li) => {
          text(ctx, ln, colX(2) + 8, y + 11 + li * LINE_H, '10px Arial', NAVY)
        })
      }
      text(ctx, `${r.totalUnit}`, colX(3) + COLS[3] / 2, y + rowH / 2, '10px Arial', NAVY, 'center')
      y += rowH
    })
  }

  y += 40

  // ===== TANDA TANGAN =====
  text(ctx, 'Mengetahui,', CANVAS_W - MARGIN - 90, y, '10px Arial', NAVY, 'center')
  text(ctx, '_______________________', CANVAS_W - MARGIN - 90, y + 55, '10px Arial', MUTED, 'center')
  text(ctx, 'Koordinator Kesekretariatan', CANVAS_W - MARGIN - 90, y + 80, 'bold 10px Arial-Bold', NAVY, 'center')

  return canvasToA4Pdf(canvas, `Rekap Sewa Tenda ${tanggal}`)
}