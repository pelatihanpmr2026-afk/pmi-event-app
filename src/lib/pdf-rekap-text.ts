import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib'

export const REKAP_A4_W = 595.28
export const REKAP_A4_H = 841.89
export const REKAP_NAVY = rgb(0.212, 0.325, 0.647)
export const REKAP_PINK = rgb(0.925, 0.243, 0.588)
export const REKAP_YELLOW = rgb(0.992, 0.761, 0.059)
export const REKAP_MUTED = rgb(0.42, 0.45, 0.5)
export const REKAP_STRIPE = rgb(0.961, 0.969, 0.984)

export async function createRekapPdf(title: string) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  pdf.setTitle(title)
  pdf.setProducer('Sistem Pendaftaran PMR 2026')
  return { pdf, regular, bold }
}

export function addRekapPage(pdf: PDFDocument, title: string, tanggal: string, bold: PDFFont, regular: PDFFont) {
  const page = pdf.addPage([REKAP_A4_W, REKAP_A4_H])
  page.drawRectangle({ x: 0, y: REKAP_A4_H - 80, width: REKAP_A4_W, height: 80, color: REKAP_NAVY })
  page.drawRectangle({ x: 0, y: REKAP_A4_H - 86, width: REKAP_A4_W, height: 6, color: REKAP_PINK })
  drawText(page, title, REKAP_A4_W / 2, 25, bold, 19, rgb(1, 1, 1), 'center')
  drawText(page, tanggal, REKAP_A4_W / 2, 52, regular, 11, REKAP_YELLOW, 'center')
  return page
}

export function drawText(page: PDFPage, value: string, x: number, top: number, font: PDFFont, size: number, color = REKAP_NAVY, align: 'left' | 'center' | 'right' = 'left') {
  const width = font.widthOfTextAtSize(value, size)
  const drawX = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x
  page.drawText(value, { x: drawX, y: REKAP_A4_H - top - size, size, font, color })
}

export function drawFittedText(page: PDFPage, value: string, x: number, top: number, maxWidth: number, font: PDFFont, size: number, color = REKAP_NAVY, align: 'left' | 'center' | 'right' = 'left') {
  let fittedSize = size
  while (fittedSize > 6 && font.widthOfTextAtSize(value, fittedSize) > maxWidth) fittedSize -= 0.5
  drawText(page, value, x, top + (size - fittedSize) * 0.45, font, fittedSize, color, align)
}

export function rect(page: PDFPage, x: number, top: number, width: number, height: number, color?: ReturnType<typeof rgb>, border = REKAP_NAVY) {
  page.drawRectangle({ x, y: REKAP_A4_H - top - height, width, height, color, borderColor: border, borderWidth: 1 })
}

export function line(page: PDFPage, x1: number, top1: number, x2: number, top2: number, color = REKAP_NAVY, width = 1) {
  page.drawLine({ start: { x: x1, y: REKAP_A4_H - top1 }, end: { x: x2, y: REKAP_A4_H - top2 }, color, thickness: width })
}

export function drawTableWithFonts(page: PDFPage, x: number, top: number, widths: number[], headers: string[], rows: string[][], fonts: { regular: PDFFont; bold: PDFFont }, totalRow?: string[], rowHeight = 24) {
  const tableWidth = widths.reduce((sum, width) => sum + width, 0)
  const colX = (index: number) => x + widths.slice(0, index).reduce((sum, width) => sum + width, 0)
  rect(page, x, top, tableWidth, rowHeight, REKAP_NAVY)
  headers.forEach((header, index) => {
    rect(page, colX(index), top, widths[index], rowHeight, REKAP_NAVY)
    drawFittedText(page, header, colX(index) + widths[index] / 2, top + 6, widths[index] - 8, fonts.bold, 9, rgb(1, 1, 1), 'center')
  })
  let currentTop = top + rowHeight
  const bodyRows = rows.length > 0 ? rows : [headers.map(() => '')]
  bodyRows.forEach((row, rowIndex) => {
    rect(page, x, currentTop, tableWidth, rowHeight, rowIndex % 2 === 1 ? REKAP_STRIPE : rgb(1, 1, 1))
    row.forEach((cell, index) => {
      rect(page, colX(index), currentTop, widths[index], rowHeight, undefined)
      if (!cell) return
      const centered = index !== 1
      drawFittedText(page, cell, centered ? colX(index) + widths[index] / 2 : colX(index) + 6, currentTop + 6, widths[index] - 10, fonts.regular, 9, REKAP_NAVY, centered ? 'center' : 'left')
    })
    currentTop += rowHeight
  })
  if (totalRow) {
    totalRow.forEach((cell, index) => {
      rect(page, colX(index), currentTop, widths[index], rowHeight, REKAP_YELLOW)
      if (cell) drawFittedText(page, cell, colX(index) + widths[index] / 2, currentTop + 6, widths[index] - 10, fonts.bold, 9, REKAP_NAVY, 'center')
    })
    currentTop += rowHeight
  }
  return currentTop
}

const REKAP_TABLE_BOTTOM = 760

/**
 * Menggambar tabel rekap pada beberapa halaman A4. Header tabel selalu
 * diulang dan baris total tidak pernah diletakkan terpotong di bawah halaman.
 */
export function drawPaginatedTable({
  page: firstPage,
  top: firstTop,
  x,
  widths,
  headers,
  rows,
  fonts,
  totalRow,
  rowHeight = 24,
  createPage,
  continuationTitle,
}: {
  page: PDFPage
  top: number
  x: number
  widths: number[]
  headers: string[]
  rows: string[][]
  fonts: { regular: PDFFont; bold: PDFFont }
  totalRow?: string[]
  rowHeight?: number
  createPage: () => PDFPage
  continuationTitle?: string
}): { page: PDFPage; top: number } {
  const tableWidth = widths.reduce((sum, width) => sum + width, 0)
  const colX = (index: number) => x + widths.slice(0, index).reduce((sum, width) => sum + width, 0)
  const drawHeader = (page: PDFPage, top: number) => {
    rect(page, x, top, tableWidth, rowHeight, REKAP_NAVY)
    headers.forEach((header, index) => {
      rect(page, colX(index), top, widths[index], rowHeight, REKAP_NAVY)
      drawFittedText(page, header, colX(index) + widths[index] / 2, top + 6, widths[index] - 8, fonts.bold, 9, rgb(1, 1, 1), 'center')
    })
    return top + rowHeight
  }
  const nextPage = () => {
    const page = createPage()
    if (continuationTitle) drawText(page, continuationTitle, REKAP_A4_W / 2, 96, fonts.bold, 10, REKAP_MUTED, 'center')
    return { page, top: drawHeader(page, 116) }
  }

  let page = firstPage
  let currentTop = drawHeader(page, firstTop)
  const bodyRows = rows.length > 0 ? rows : [headers.map(() => '')]

  bodyRows.forEach((row, rowIndex) => {
    const reserveForTotal = totalRow && rowIndex === bodyRows.length - 1 ? rowHeight : 0
    if (currentTop + rowHeight + reserveForTotal > REKAP_TABLE_BOTTOM) ({ page, top: currentTop } = nextPage())
    rect(page, x, currentTop, tableWidth, rowHeight, rowIndex % 2 === 1 ? REKAP_STRIPE : rgb(1, 1, 1))
    row.forEach((cell, index) => {
      rect(page, colX(index), currentTop, widths[index], rowHeight, undefined)
      if (!cell) return
      const centered = index !== 1
      drawFittedText(page, cell, centered ? colX(index) + widths[index] / 2 : colX(index) + 6, currentTop + 6, widths[index] - 10, fonts.regular, 9, REKAP_NAVY, centered ? 'center' : 'left')
    })
    currentTop += rowHeight
  })

  if (totalRow) {
    if (currentTop + rowHeight > REKAP_TABLE_BOTTOM) ({ page, top: currentTop } = nextPage())
    totalRow.forEach((cell, index) => {
      rect(page, colX(index), currentTop, widths[index], rowHeight, REKAP_YELLOW)
      if (cell) drawFittedText(page, cell, colX(index) + widths[index] / 2, currentTop + 6, widths[index] - 10, fonts.bold, 9, REKAP_NAVY, 'center')
    })
    currentTop += rowHeight
  }

  return { page, top: currentTop }
}

export function rp(value: number) {
  return `Rp${value.toLocaleString('id-ID')}`
}
