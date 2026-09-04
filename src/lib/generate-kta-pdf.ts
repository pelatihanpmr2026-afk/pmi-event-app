import path from 'path'
import { readFile } from 'fs/promises'
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import sharp from 'sharp'

const TEMPLATE_WIDTH = 1019
const TEMPLATE_HEIGHT = 643
const ID_CARD_WIDTH_PT = (85.6 / 25.4) * 72
const ID_CARD_HEIGHT_PT = (54 / 25.4) * 72
const A4_WIDTH_PT = (210 / 25.4) * 72
const A4_HEIGHT_PT = (297 / 25.4) * 72
const CARDS_PER_PAGE = 10
const CARD_COLUMNS = 2
const CARD_ROWS = 5
const CARD_GAP_X = 18
const CARD_GAP_Y = 18
const PAGE_MARGIN_X = (A4_WIDTH_PT - CARD_COLUMNS * ID_CARD_WIDTH_PT - (CARD_COLUMNS - 1) * CARD_GAP_X) / 2
const PAGE_MARGIN_Y = (A4_HEIGHT_PT - CARD_ROWS * ID_CARD_HEIGHT_PT - (CARD_ROWS - 1) * CARD_GAP_Y) / 2
const PHOTO_X = 760
const PHOTO_Y = 163
const PHOTO_WIDTH = 220
const PHOTO_HEIGHT = 355
const VALUE_X = 345
const VALUE_MAX_WIDTH = PHOTO_X - VALUE_X - 16

const pxToPtX = (value: number) => value * ID_CARD_WIDTH_PT / TEMPLATE_WIDTH
const pxToPtY = (value: number) => value * ID_CARD_HEIGHT_PT / TEMPLATE_HEIGHT

export interface KtaParticipant {
  noPeserta: string | null
  namaLengkap: string
  tempatLahir: string
  tanggalLahir: Date
  alamat: string
  agama: string
  golonganDarah: string
  fotoBuffer?: Buffer
}

interface KtaPdfParams {
  namaSekolah: string
  peserta: KtaParticipant[]
}

function titleCase(value: string) {
  return value.toLocaleLowerCase('id-ID').replace(/(^|[\s/-])[a-zà-ÿ]/g, (letter) => letter.toLocaleUpperCase('id-ID'))
}

function formatEnum(value: string) {
  return titleCase(value === 'TIDAK_TAHU' ? 'Tidak tahu' : value.replaceAll('_', ' '))
}

function formatTanggalLahir(value: Date) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(value)
}

function fitPdfText(font: PDFFont, text: string, maxWidth: number, size: number) {
  let fittedSize = size
  while (font.widthOfTextAtSize(text, fittedSize) > maxWidth && fittedSize > 4.5) fittedSize -= 0.25
  if (font.widthOfTextAtSize(text, fittedSize) <= maxWidth) return { text, size: fittedSize }
  let fittedText = `${text.slice(0, Math.max(0, text.length - 3))}...`
  while (fittedText.length > 3 && font.widthOfTextAtSize(fittedText, fittedSize) > maxWidth) fittedText = `${fittedText.slice(0, -4)}...`
  return { text: fittedText, size: fittedSize }
}

async function cleanTemplatePlaceholders(buffer: Buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const left = 40
  const right = 735
  const top = 205
  const bottom = 490
  const isPlaceholderPixel = (pixelX: number, pixelY: number) => {
    const offset = (pixelY * info.width + pixelX) * info.channels
    const red = data[offset]
    const green = data[offset + 1]
    const blue = data[offset + 2]
    return Math.min(red, green, blue) > 145 && Math.max(red, green, blue) - Math.min(red, green, blue) < 45
  }

  for (let pixelY = top; pixelY < bottom; pixelY += 1) {
    for (let pixelX = left; pixelX < right; pixelX += 1) {
      if (!isPlaceholderPixel(pixelX, pixelY)) continue
      let sourceX = pixelX - 1
      while (sourceX >= left && isPlaceholderPixel(sourceX, pixelY)) sourceX -= 1
      if (sourceX < left) {
        sourceX = pixelX + 1
        while (sourceX < right && isPlaceholderPixel(sourceX, pixelY)) sourceX += 1
      }
      if (sourceX < left || sourceX >= right) continue
      const targetOffset = (pixelY * info.width + pixelX) * info.channels
      const sourceOffset = (pixelY * info.width + sourceX) * info.channels
      data[targetOffset] = data[sourceOffset]
      data[targetOffset + 1] = data[sourceOffset + 1]
      data[targetOffset + 2] = data[sourceOffset + 2]
    }
  }
  return sharp(data, { raw: info }).png().toBuffer()
}

function drawTopText(page: PDFPage, text: string, x: number, topY: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>, cardX: number, cardY: number) {
  page.drawText(text, { x: cardX + pxToPtX(x), y: cardY + ID_CARD_HEIGHT_PT - pxToPtY(topY) - size * 0.78, size, font, color })
}

async function drawFrontCard(pdf: PDFDocument, page: PDFPage, templateImage: PDFImage, regularFont: PDFFont, boldFont: PDFFont, namaSekolah: string, participant: KtaParticipant, cardX: number, cardY: number) {
  page.drawImage(templateImage, { x: cardX, y: cardY, width: ID_CARD_WIDTH_PT, height: ID_CARD_HEIGHT_PT })
  page.drawRectangle({ x: cardX + pxToPtX(45), y: cardY + ID_CARD_HEIGHT_PT - pxToPtY(636), width: pxToPtX(600), height: pxToPtY(126), color: rgb(1, 1, 1) })

  if (participant.fotoBuffer) {
    const photoBuffer = await sharp(participant.fotoBuffer).rotate().resize({ width: PHOTO_WIDTH, height: PHOTO_HEIGHT, fit: 'cover' }).png().toBuffer()
    const photoImage = await pdf.embedPng(photoBuffer)
    page.drawImage(photoImage, { x: cardX + pxToPtX(PHOTO_X), y: cardY + ID_CARD_HEIGHT_PT - pxToPtY(PHOTO_Y + PHOTO_HEIGHT), width: pxToPtX(PHOTO_WIDTH), height: pxToPtY(PHOTO_HEIGHT) })
  }

  const white = rgb(1, 1, 1)
  const black = rgb(0.067, 0.067, 0.067)
  const red = rgb(0.89, 0.024, 0.075)
  const textSize = pxToPtY(25)
  const values = [
    ['No. Reg. Induk', participant.noPeserta ?? '-'],
    ['Nama', titleCase(participant.namaLengkap)],
    ['Tempat, Tanggal Lahir', `${titleCase(participant.tempatLahir)}, ${formatTanggalLahir(participant.tanggalLahir)}`],
    ['Gol. Darah', formatEnum(participant.golonganDarah)],
    ['Agama', formatEnum(participant.agama)],
    ['Alamat', titleCase(participant.alamat)],
  ]
  values.forEach(([label, value], index) => {
    const lineY = 241 + index * 42
    drawTopText(page, label, 55, lineY, textSize, regularFont, white, cardX, cardY)
    drawTopText(page, ':', 320, lineY, textSize, regularFont, white, cardX, cardY)
    const fittedValue = fitPdfText(regularFont, value, pxToPtX(VALUE_MAX_WIDTH), textSize)
    drawTopText(page, fittedValue.text, VALUE_X, lineY, fittedValue.size, regularFont, white, cardX, cardY)
  })

  const qrBuffer = await QRCode.toBuffer(participant.noPeserta ?? participant.namaLengkap, { type: 'png', width: 256, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#ffffff', light: '#e30613' } })
  const qrImage = await pdf.embedPng(qrBuffer)
  page.drawImage(qrImage, { x: cardX + pxToPtX(55), y: cardY + ID_CARD_HEIGHT_PT - pxToPtY(620), width: pxToPtX(104), height: pxToPtY(96) })
  drawTopText(page, 'Palang Merah Remaja', 177, 544, pxToPtY(31), boldFont, black, cardX, cardY)
  drawTopText(page, 'PMI Kab. Cianjur', 177, 578, pxToPtY(30), regularFont, red, cardX, cardY)
  const unit = fitPdfText(regularFont, `Unit ${titleCase(namaSekolah)}`, pxToPtX(400), pxToPtY(30))
  drawTopText(page, unit.text, 177, 611, unit.size, regularFont, red, cardX, cardY)
}

export async function generateKtaPdf({ namaSekolah, peserta }: KtaPdfParams) {
  if (peserta.length === 0) throw new Error('Sekolah belum memiliki peserta')
  const templateBuffer = await readFile(path.join(process.cwd(), 'public', 'assets', 'template_kta_front.png'))
  const cleanedTemplateBuffer = await cleanTemplatePlaceholders(templateBuffer)
  const backTemplateBuffer = await readFile(path.join(process.cwd(), 'public', 'assets', 'template-kta-back.png'))
  const pdf = await PDFDocument.create()
  const [regularFont, boldFont] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold)])
  const frontTemplateImage = await pdf.embedPng(cleanedTemplateBuffer)
  const backImage = await pdf.embedPng(backTemplateBuffer)
  pdf.setTitle(`KTA PMR - ${namaSekolah}`)
  pdf.setSubject('Kartu Tanda Anggota Palang Merah Remaja')
  pdf.setProducer('Sistem Pendaftaran PMR 2026')

  for (let batchStart = 0; batchStart < peserta.length; batchStart += CARDS_PER_PAGE) {
    const batch = peserta.slice(batchStart, batchStart + CARDS_PER_PAGE)
    const frontPage = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT])
    const backPage = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT])
    for (let index = 0; index < batch.length; index += 1) {
      const column = index % CARD_COLUMNS
      const row = Math.floor(index / CARD_COLUMNS)
      const cardX = PAGE_MARGIN_X + column * (ID_CARD_WIDTH_PT + CARD_GAP_X)
      const cardY = A4_HEIGHT_PT - PAGE_MARGIN_Y - (row + 1) * ID_CARD_HEIGHT_PT - row * CARD_GAP_Y
      await drawFrontCard(pdf, frontPage, frontTemplateImage, regularFont, boldFont, namaSekolah, batch[index], cardX, cardY)
      backPage.drawImage(backImage, { x: cardX, y: cardY, width: ID_CARD_WIDTH_PT, height: ID_CARD_HEIGHT_PT })
      for (const page of [frontPage, backPage]) page.drawRectangle({ x: cardX, y: cardY, width: ID_CARD_WIDTH_PT, height: ID_CARD_HEIGHT_PT, borderColor: rgb(0.72, 0.72, 0.72), borderWidth: 0.35 })
    }
  }
  return Buffer.from(await pdf.save())
}
