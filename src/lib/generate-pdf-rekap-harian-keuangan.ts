import { createCanvas, SKRSContext2D } from '@napi-rs/canvas'
import { PDFDocument } from 'pdf-lib'
import { registerFonts } from './register-fonts'

const WIDTH = 900
const MARGIN = 50
const NAVY = '#3653A5'

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
  const rowH = 36
  const HEIGHT = 220 + rows.length * rowH + 150

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, WIDTH, 100)
  text(ctx, 'REKAP KEUANGAN HARIAN', WIDTH / 2, 45, '26px Silkscreen-Bold', '#FFFFFF', 'center')
  text(ctx, tanggal, WIDTH / 2, 75, '16px Silkscreen', '#FDC20F', 'center')

  let y = 140
  const col = { no: MARGIN + 20, ket: MARGIN + 60, uraian: 480, debit: 610, kredit: 730, utang: 850 }

  ctx.fillStyle = NAVY
  ctx.fillRect(MARGIN, y, WIDTH - MARGIN * 2, 36)
  text(ctx, 'NO', col.no, y + 18, 'bold 12px Silkscreen-Bold', '#FFFFFF')
  text(ctx, 'KETERANGAN', col.ket, y + 18, 'bold 12px Silkscreen-Bold', '#FFFFFF')
  text(ctx, 'URAIAN', col.uraian, y + 18, 'bold 12px Silkscreen-Bold', '#FFFFFF')
  text(ctx, 'DEBIT', col.debit, y + 18, 'bold 12px Silkscreen-Bold', '#FFFFFF', 'right')
  text(ctx, 'KREDIT', col.kredit, y + 18, 'bold 12px Silkscreen-Bold', '#FFFFFF', 'right')
  text(ctx, 'UTANG', col.utang, y + 18, 'bold 12px Silkscreen-Bold', '#FFFFFF', 'right')
  y += 36

  rows.forEach((r, i) => {
    if (i % 2 === 1) {
      ctx.fillStyle = '#F5F7FB'
      ctx.fillRect(MARGIN, y, WIDTH - MARGIN * 2, rowH)
    }
    text(ctx, `${i + 1}`, col.no, y + rowH / 2, '13px Silkscreen', NAVY)
    text(ctx, r.keterangan.slice(0, 45), col.ket, y + rowH / 2, '12px Silkscreen', NAVY)
    text(ctx, r.uraian, col.uraian, y + rowH / 2, '12px Silkscreen', NAVY)
    text(ctx, r.debit ? rp(r.debit) : '-', col.debit, y + rowH / 2, '12px Silkscreen', NAVY, 'right')
    text(ctx, r.kredit ? rp(r.kredit) : '-', col.kredit, y + rowH / 2, '12px Silkscreen', NAVY, 'right')
    text(ctx, r.utang ? rp(r.utang) : '-', col.utang, y + rowH / 2, '12px Silkscreen', NAVY, 'right')
    y += rowH
  })

  ctx.strokeStyle = NAVY
  ctx.lineWidth = 3
  ctx.strokeRect(MARGIN, 140, WIDTH - MARGIN * 2, y - 140)

  y += 30
  ctx.fillStyle = '#FDC20F'
  ctx.fillRect(MARGIN, y, WIDTH - MARGIN * 2, 90)
  text(ctx, `Total Debit: ${rp(totals.totalDebit)}`, MARGIN + 24, y + 25, 'bold 14px Silkscreen-Bold', NAVY)
  text(ctx, `Total Kredit: ${rp(totals.totalKredit)}`, MARGIN + 24, y + 50, 'bold 14px Silkscreen-Bold', NAVY)
  text(ctx, `Total Utang: ${rp(totals.totalUtang)}`, MARGIN + 24, y + 75, 'bold 14px Silkscreen-Bold', NAVY)

  const pngBuffer = canvas.toBuffer('image/png')
  const pdfDoc = await PDFDocument.create()
  const img = await pdfDoc.embedPng(pngBuffer)
  const page = pdfDoc.addPage([WIDTH, HEIGHT])
  page.drawImage(img, { x: 0, y: 0, width: WIDTH, height: HEIGHT })
  const bytes = await pdfDoc.save()
  return Buffer.from(bytes)
}