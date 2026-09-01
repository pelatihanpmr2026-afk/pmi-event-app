import path from 'path'
import { readFile } from 'fs/promises'
import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas'
import { PDFDocument, rgb } from 'pdf-lib'
import QRCode from 'qrcode'
import sharp from 'sharp'
import { registerFonts } from './register-fonts'

// 85,6 x 54 mm pada 300 DPI. PDF tetap memakai ukuran fisik kartu ID,
// sehingga printer dapat mencetak 100% tanpa scaling.
const WIDTH = Math.round((85.6 / 25.4) * 300)
const HEIGHT = Math.round((54 / 25.4) * 300)
const TEMPLATE_WIDTH = 1019
const TEMPLATE_HEIGHT = 643
const SCALE_X = WIDTH / TEMPLATE_WIDTH
const SCALE_Y = HEIGHT / TEMPLATE_HEIGHT
const ID_CARD_WIDTH_PT = (85.6 / 25.4) * 72
const ID_CARD_HEIGHT_PT = (54 / 25.4) * 72
const A4_WIDTH_PT = (210 / 25.4) * 72
const A4_HEIGHT_PT = (297 / 25.4) * 72
const CARDS_PER_PAGE = 10
const CARD_COLUMNS = 2
const CARD_ROWS = 5
const PAGE_MARGIN_X = (A4_WIDTH_PT - CARD_COLUMNS * ID_CARD_WIDTH_PT) / 2
const PAGE_MARGIN_Y = (A4_HEIGHT_PT - CARD_ROWS * ID_CARD_HEIGHT_PT) / 2

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

function fitFont(ctx: SKRSContext2D, text: string, maxWidth: number, size: number, family: string) {
  let nextSize = size
  ctx.font = `${nextSize}px ${family}`
  while (ctx.measureText(text).width > maxWidth && nextSize > 12) {
    nextSize -= 1
    ctx.font = `${nextSize}px ${family}`
  }
  return nextSize
}

function x(value: number) {
  return value * SCALE_X
}

function y(value: number) {
  return value * SCALE_Y
}

function titleCase(value: string) {
  return value
    .toLocaleLowerCase('id-ID')
    .replace(/(^|[\s/-])[a-zà-ÿ]/g, (letter) => letter.toLocaleUpperCase('id-ID'))
}

function formatEnum(value: string) {
  return titleCase(value === 'TIDAK_TAHU' ? 'Tidak tahu' : value.replaceAll('_', ' '))
}

function formatTanggalLahir(value: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(value)
}

function drawCoverFit(ctx: SKRSContext2D, image: Awaited<ReturnType<typeof loadImage>>, x: number, y: number, width: number, height: number) {
  const imageRatio = image.width / image.height
  const boxRatio = width / height
  let drawWidth = width
  let drawHeight = height
  let offsetX = 0
  let offsetY = 0

  if (imageRatio > boxRatio) {
    drawWidth = height * imageRatio
    offsetX = (width - drawWidth) / 2
  } else {
    drawHeight = width / imageRatio
    offsetY = (height - drawHeight) / 2
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  ctx.drawImage(image, x + offsetX, y + offsetY, drawWidth, drawHeight)
  ctx.restore()
}

async function removeTemplatePlaceholders(buffer: Buffer) {
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

  // Menghapus piksel putih placeholder dengan piksel latar terdekat.
  // Tidak menggambar panel, warna baru, atau blur di belakang teks.
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

async function renderFront(namaSekolah: string, participant: KtaParticipant) {
  registerFonts()
  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')
  const templatePath = path.join(process.cwd(), 'public', 'assets', 'template_kta_front.png')
  const templateBuffer = await readFile(templatePath)
  const cleanedTemplateBuffer = await removeTemplatePlaceholders(templateBuffer)
  const template = await loadImage(cleanedTemplateBuffer)
  ctx.drawImage(template, 0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  const schoolName = titleCase(namaSekolah)
  const labelFontSize = y(25)
  const valueFontSize = y(25)

  // Bagian bawah template memang berwarna putih secara desain; area ini
  // dipakai untuk mengganti placeholder QR dan identitas sekolah.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x(45), y(510), x(600), y(126))

  const values = [
    ['No. Reg. Induk', participant.noPeserta ?? '-'],
    ['Nama', titleCase(participant.namaLengkap)],
    ['Tempat, Tanggal Lahir', `${titleCase(participant.tempatLahir)}, ${formatTanggalLahir(participant.tanggalLahir)}`],
    ['Gol Darah', formatEnum(participant.golonganDarah)],
    ['Agama', formatEnum(participant.agama)],
    ['Alamat', titleCase(participant.alamat)],
  ]

  values.forEach(([label, value], index) => {
    const lineY = 241 + index * 42
    ctx.font = `${labelFontSize}px Arial`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, x(55), y(lineY))
    ctx.fillText(':', x(320), y(lineY))
    const valueSize = fitFont(ctx, value, x(415), valueFontSize, 'Arial')
    ctx.font = `${valueSize}px Arial`
    ctx.fillText(value, x(345), y(lineY))
  })

  if (participant.fotoBuffer) {
    const photo = await loadImage(participant.fotoBuffer)
    drawCoverFit(ctx, photo, x(770), y(200), x(190), y(283))
  } else {
    ctx.fillStyle = '#e30613'
    ctx.fillRect(x(770), y(200), x(190), y(283))
    ctx.fillStyle = '#ffffff'
    ctx.font = `${y(24)}px Arial-Bold`
    ctx.textAlign = 'center'
    ctx.fillText('Foto tidak ada', x(865), y(342))
  }

  const qrBuffer = await QRCode.toBuffer(participant.noPeserta ?? participant.namaLengkap, {
    type: 'png',
    width: 256,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#ffffff', light: '#e30613' },
  })
  const qrImage = await loadImage(qrBuffer)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(qrImage, x(55), y(524), x(104), y(96))

  ctx.textAlign = 'left'
  ctx.fillStyle = '#111111'
  ctx.font = `bold ${y(31)}px Arial-Bold`
  ctx.fillText('Palang Merah Remaja', x(177), y(544))
  ctx.font = `${y(30)}px Arial`
  ctx.fillText('PMI Cianjur', x(177), y(578))
  ctx.fillText(`Unit ${schoolName}`, x(177), y(611))

  return canvas.toBuffer('image/png')
}

export async function generateKtaPdf({ namaSekolah, peserta }: KtaPdfParams) {
  if (peserta.length === 0) throw new Error('Sekolah belum memiliki peserta')

  const backTemplateBuffer = await readFile(path.join(process.cwd(), 'public', 'assets', 'template-kta-back.png'))
  const pdf = await PDFDocument.create()
  pdf.setTitle(`KTA PMR - ${namaSekolah}`)
  pdf.setSubject('Kartu Tanda Anggota Palang Merah Remaja')
  pdf.setProducer('Sistem Pendaftaran PMR 2026')

  const backImage = await pdf.embedPng(backTemplateBuffer)

  // Satu paket cetak terdiri dari halaman depan dan belakang yang posisinya sama.
  // Dengan demikian halaman kedua dapat dipakai untuk cetak duplex.
  for (let batchStart = 0; batchStart < peserta.length; batchStart += CARDS_PER_PAGE) {
    const batch = peserta.slice(batchStart, batchStart + CARDS_PER_PAGE)
    const frontPage = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT])
    const backPage = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT])

    for (let index = 0; index < batch.length; index += 1) {
      const participant = batch[index]
      const column = index % CARD_COLUMNS
      const row = Math.floor(index / CARD_COLUMNS)
      const cardX = PAGE_MARGIN_X + column * ID_CARD_WIDTH_PT
      const cardY = A4_HEIGHT_PT - PAGE_MARGIN_Y - (row + 1) * ID_CARD_HEIGHT_PT
      const frontBuffer = await renderFront(namaSekolah, participant)
      const frontImage = await pdf.embedPng(frontBuffer)

      frontPage.drawImage(frontImage, {
        x: cardX,
        y: cardY,
        width: ID_CARD_WIDTH_PT,
        height: ID_CARD_HEIGHT_PT,
      })
      backPage.drawImage(backImage, {
        x: cardX,
        y: cardY,
        width: ID_CARD_WIDTH_PT,
        height: ID_CARD_HEIGHT_PT,
      })

      // Garis bantu potong tipis, tidak menutupi desain maupun teks kartu.
      frontPage.drawRectangle({
        x: cardX,
        y: cardY,
        width: ID_CARD_WIDTH_PT,
        height: ID_CARD_HEIGHT_PT,
        borderColor: rgb(0.72, 0.72, 0.72),
        borderWidth: 0.35,
      })
      backPage.drawRectangle({
        x: cardX,
        y: cardY,
        width: ID_CARD_WIDTH_PT,
        height: ID_CARD_HEIGHT_PT,
        borderColor: rgb(0.72, 0.72, 0.72),
        borderWidth: 0.35,
      })
    }
  }

  return Buffer.from(await pdf.save())
}
