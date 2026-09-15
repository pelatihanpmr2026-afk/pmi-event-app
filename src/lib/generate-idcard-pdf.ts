import { readFile } from 'fs/promises'
import { PDFDocument, PDFImage, PDFPage, rgb } from 'pdf-lib'
import { getAbsolutePathFromUrl } from './save-file'

const TEMPLATE_WIDTH = 832
const TEMPLATE_HEIGHT = 1095

// Ukuran fisik kartu mengikuti ukuran KTA (CR80): tinggi 85,6mm.
// Lebar disesuaikan agar proporsi template ID card panitia terjaga.
const CARD_HEIGHT_MM = 85.6
const CARD_WIDTH_MM = CARD_HEIGHT_MM * (TEMPLATE_WIDTH / TEMPLATE_HEIGHT)

const CARD_WIDTH_PT = (CARD_WIDTH_MM / 25.4) * 72
const CARD_HEIGHT_PT = (CARD_HEIGHT_MM / 25.4) * 72
const A4_WIDTH_PT = (21 / 2.54) * 72
const A4_HEIGHT_PT = (29.7 / 2.54) * 72

const CARDS_PER_PAGE = 6
const CARD_COLUMNS = 2
const CARD_ROWS = 3
const CARD_GAP = 12

const PAGE_MARGIN_X = (A4_WIDTH_PT - CARD_COLUMNS * CARD_WIDTH_PT - (CARD_COLUMNS - 1) * CARD_GAP) / 2
const PAGE_MARGIN_Y = (A4_HEIGHT_PT - CARD_ROWS * CARD_HEIGHT_PT - (CARD_ROWS - 1) * CARD_GAP) / 2

function cardPosition(index: number): { x: number; y: number } {
  const column = index % CARD_COLUMNS
  const row = Math.floor(index / CARD_COLUMNS)
  return {
    x: PAGE_MARGIN_X + column * (CARD_WIDTH_PT + CARD_GAP),
    y: A4_HEIGHT_PT - PAGE_MARGIN_Y - (row + 1) * CARD_HEIGHT_PT - row * CARD_GAP,
  }
}

function drawCard(page: PDFPage, pos: { x: number; y: number }, image: PDFImage) {
  page.drawImage(image, { x: pos.x, y: pos.y, width: CARD_WIDTH_PT, height: CARD_HEIGHT_PT })
  page.drawRectangle({
    x: pos.x,
    y: pos.y,
    width: CARD_WIDTH_PT,
    height: CARD_HEIGHT_PT,
    borderColor: rgb(0.72, 0.72, 0.72),
    borderWidth: 0.35,
  })
}

export interface IdCardPdfItem {
  nama: string
  imageUrl?: string | null
}

export async function generateIdCardPdf(items: IdCardPdfItem[]): Promise<Buffer> {
  if (items.length === 0) throw new Error('Belum ada panitia yang memiliki ID card')

  const pdf = await PDFDocument.create()
  pdf.setTitle('ID Card Panitia PMR 2026')
  pdf.setProducer('Sistem Pendaftaran PMR 2026')

  const start = Date.now()
  let placedCount = 0
  let currentPage = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT])

  for (const item of items) {
    if (!item.imageUrl) continue

    let imageBuffer: Buffer
    try {
      imageBuffer = await readFile(getAbsolutePathFromUrl(item.imageUrl))
    } catch {
      continue
    }

    const image = await pdf.embedPng(imageBuffer)

    if (placedCount > 0 && placedCount % CARDS_PER_PAGE === 0) {
      currentPage = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT])
    }

    drawCard(currentPage, cardPosition(placedCount), image)
    placedCount += 1
  }

  if (placedCount === 0) throw new Error('Tidak ada file ID card yang bisa digabungkan')

  const totalPages = Math.ceil(placedCount / CARDS_PER_PAGE)
  console.log(`[generateIdCardPdf] ${placedCount} kartu, ${totalPages} halaman, ${Date.now() - start}ms`)
  return Buffer.from(await pdf.save())
}