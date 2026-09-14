import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib'

export const REKAP_A4_W = 595.28
export const REKAP_A4_H = 841.89
export const REKAP_NAVY = rgb(0.06, 0.06, 0.06)
export const REKAP_PINK = rgb(0.82, 0.82, 0.82)
export const REKAP_YELLOW = rgb(0.9, 0.9, 0.9)
export const REKAP_MUTED = rgb(0.45, 0.45, 0.45)
export const REKAP_STRIPE = rgb(0.95, 0.95, 0.95)

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
  drawText(page, title, REKAP_A4_W / 2, 25, bold, 19, REKAP_NAVY, 'center')
  drawText(page, tanggal, REKAP_A4_W / 2, 52, regular, 11, REKAP_MUTED, 'center')
  line(page, 20, 82, REKAP_A4_W - 20, 82, REKAP_NAVY, 0.5)
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
  rect(page, x, top, tableWidth, rowHeight, undefined, REKAP_NAVY)
  headers.forEach((header, index) => {
    rect(page, colX(index), top, widths[index], rowHeight, undefined, REKAP_NAVY)
    drawFittedText(page, header, colX(index) + widths[index] / 2, top + 6, widths[index] - 8, fonts.bold, 9, REKAP_NAVY, 'center')
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
    rect(page, x, top, tableWidth, rowHeight, undefined, REKAP_NAVY)
    headers.forEach((header, index) => {
      rect(page, colX(index), top, widths[index], rowHeight, undefined, REKAP_NAVY)
      drawFittedText(page, header, colX(index) + widths[index] / 2, top + 6, widths[index] - 8, fonts.bold, 9, REKAP_NAVY, 'center')
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

export const MONO_BLACK = rgb(0, 0, 0)

type MonoAlign = 'left' | 'center' | 'right'

/**
 * Kop laporan monokrom profesional: judul besar, subjudul tanggal,
 * lalu garis ganda (tipis + tebal). Hanya warna hitam.
 */
export function addMonoHeader(
  pdf: PDFDocument,
  reportTitle: string,
  subtitle: string,
  bold: PDFFont,
  regular: PDFFont
): PDFPage {
  const page = pdf.addPage([REKAP_A4_W, REKAP_A4_H])
  drawText(page, reportTitle, REKAP_A4_W / 2, 30, bold, 16, MONO_BLACK, 'center')
  drawText(page, subtitle, REKAP_A4_W / 2, 54, regular, 10, MONO_BLACK, 'center')
  line(page, 20, 72, REKAP_A4_W - 20, 72, MONO_BLACK, 0.5)
  line(page, 20, 75, REKAP_A4_W - 20, 75, MONO_BLACK, 1.4)
  return page
}

/**
 * Tabel monokrom profesional: tanpa blok warna dan tanpa zebra.
 * Header tebal diapit garis, isi dibatasi garis rambut, baris total
 * tebal diapit garis tebal.
 */
export function drawMonoTable({
  page: firstPage,
  top: firstTop,
  x,
  widths,
  aligns,
  headers,
  rows,
  fonts,
  totalRow,
  rowHeight = 22,
  createPage,
  continuationTitle,
  emptyText = 'Tidak ada data',
}: {
  page: PDFPage
  top: number
  x: number
  widths: number[]
  aligns: MonoAlign[]
  headers: string[]
  rows: string[][]
  fonts: { regular: PDFFont; bold: PDFFont }
  totalRow?: string[]
  rowHeight?: number
  createPage: () => PDFPage
  continuationTitle?: string
  emptyText?: string
}): { page: PDFPage; top: number } {
  const tableWidth = widths.reduce((sum, width) => sum + width, 0)
  const colX = (index: number) => x + widths.slice(0, index).reduce((sum, width) => sum + width, 0)
  const alignOf = (index: number): MonoAlign => aligns[index] ?? 'center'
  const cellX = (index: number) =>
    alignOf(index) === 'center'
      ? colX(index) + widths[index] / 2
      : alignOf(index) === 'right'
        ? colX(index) + widths[index] - 6
        : colX(index) + 6

  const drawHeader = (page: PDFPage, top: number) => {
    line(page, x, top, x + tableWidth, top, MONO_BLACK, 1.2)
    headers.forEach((header, index) => {
      drawFittedText(page, header, cellX(index), top + 5, widths[index] - 10, fonts.bold, 8.5, MONO_BLACK, alignOf(index))
    })
    line(page, x, top + 20, x + tableWidth, top + 20, MONO_BLACK, 1.2)
    return top + 20
  }
  const nextPage = () => {
    const page = createPage()
    if (continuationTitle) drawText(page, continuationTitle, REKAP_A4_W / 2, 96, fonts.bold, 10, MONO_BLACK, 'center')
    return { page, top: drawHeader(page, 116) }
  }

  let page = firstPage
  let currentTop = drawHeader(page, firstTop)

  if (rows.length === 0) {
    drawText(page, emptyText, x + tableWidth / 2, currentTop + 6, fonts.regular, 9, MONO_BLACK, 'center')
    currentTop += rowHeight
    line(page, x, currentTop, x + tableWidth, currentTop, MONO_BLACK, 0.4)
  }

  rows.forEach((row) => {
    const reserveForTotal = totalRow ? rowHeight : 0
    if (currentTop + rowHeight + reserveForTotal > REKAP_TABLE_BOTTOM) ({ page, top: currentTop } = nextPage())
    row.forEach((cell, index) => {
      if (!cell) return
      drawFittedText(page, cell, cellX(index), currentTop + 6, widths[index] - 10, fonts.regular, 9, MONO_BLACK, alignOf(index))
    })
    currentTop += rowHeight
    line(page, x, currentTop, x + tableWidth, currentTop, MONO_BLACK, 0.4)
  })

  if (totalRow) {
    if (currentTop + rowHeight > REKAP_TABLE_BOTTOM) ({ page, top: currentTop } = nextPage())
    line(page, x, currentTop, x + tableWidth, currentTop, MONO_BLACK, 1)
    totalRow.forEach((cell, index) => {
      if (!cell) return
      drawFittedText(page, cell, cellX(index), currentTop + 6, widths[index] - 10, fonts.bold, 9, MONO_BLACK, alignOf(index))
    })
    currentTop += rowHeight
    line(page, x, currentTop, x + tableWidth, currentTop, MONO_BLACK, 1.2)
  }

  return { page, top: currentTop }
}

/**
 * Blok ringkasan monokrom: label kiri, nilai rata kanan, tanpa kotak.
 */
export function drawMonoSummary(
  page: PDFPage,
  x: number,
  top: number,
  width: number,
  rows: { label: string; value: string; bold?: boolean }[],
  fonts: { regular: PDFFont; bold: PDFFont }
): number {
  let currentTop = top
  line(page, x, currentTop, x + width, currentTop, MONO_BLACK, 0.8)
  currentTop += 6
  for (const row of rows) {
    const font = row.bold ? fonts.bold : fonts.regular
    drawText(page, row.label, x, currentTop, font, 10, MONO_BLACK, 'left')
    drawText(page, row.value, x + width, currentTop, font, 10, MONO_BLACK, 'right')
    currentTop += 20
  }
  line(page, x, currentTop - 4, x + width, currentTop - 4, MONO_BLACK, 0.8)
  return currentTop
}

/**
 * Tanda tangan monokrom: jabatan, garis tangan, lalu nama.
 */
export function drawMonoSig(
  page: PDFPage,
  centerX: number,
  top: number,
  role: string,
  name: string | null,
  regular: PDFFont,
  bold: PDFFont
) {
  drawText(page, role, centerX, top, bold, 9, MONO_BLACK, 'center')
  line(page, centerX - 75, top + 56, centerX + 75, top + 56, MONO_BLACK, 0.8)
  drawText(page, name ?? '( ........................................ )', centerX, top + 62, regular, 9, MONO_BLACK, 'center')
}
