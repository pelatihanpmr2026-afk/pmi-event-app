import path from 'path'
import { readFile } from 'fs/promises'
import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas'
import { PDFDocument } from 'pdf-lib'
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

function formatEnum(value: string) {
  return value === 'TIDAK_TAHU' ? 'Tidak tahu' : value.replaceAll('_', ' ')
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

async function renderFront(namaSekolah: string, participant: KtaParticipant) {
  registerFonts()
  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')
  const templatePath = path.join(process.cwd(), 'public', 'assets', 'template_kta_front.png')
  const templateBuffer = await readFile(templatePath)
  // Bersihkan placeholder lama per baris, bukan dengan panel. Dengan begitu
  // foto/latar tetap terlihat di antara teks dan tidak ada background kotak.
  const placeholderStrips = await Promise.all(
    [300, 342, 384, 426, 468, 510].map(async (top) => ({
      input: await sharp(templateBuffer)
        .extract({ left: 24, top, width: 700, height: 34 })
        .blur(12)
        .png()
        .toBuffer(),
      left: 24,
      top,
    }))
  )
  const cleanedTemplateBuffer = await sharp(templateBuffer)
    .composite(placeholderStrips)
    .png()
    .toBuffer()
  const template = await loadImage(cleanedTemplateBuffer)
  ctx.drawImage(template, 0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  const schoolName = namaSekolah.toUpperCase()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x(48), y(145), x(630), y(52))
  fitFont(ctx, `UNIT ${schoolName}`, x(590), y(32), 'Arial')
  ctx.fillStyle = '#e30613'
  ctx.fillText(`UNIT ${schoolName}`, x(56), y(178))

  const values = [
    ['No. Reg. Induk', participant.noPeserta ?? '-'],
    ['Nama', participant.namaLengkap],
    ['TTL', `${participant.tempatLahir}, ${formatTanggalLahir(participant.tanggalLahir)}`],
    ['Gol Darah', formatEnum(participant.golonganDarah)],
    ['Agama', formatEnum(participant.agama)],
    ['Alamat', participant.alamat],
  ]

  values.forEach(([label, value], index) => {
    const lineY = 327 + index * 42
    ctx.font = `${y(27)}px Arial`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, x(55), y(lineY))
    ctx.fillText(':', x(274), y(lineY))
    const valueSize = fitFont(ctx, value, x(445), y(27), 'Arial')
    ctx.font = `${valueSize}px Arial`
    ctx.fillText(value, x(296), y(lineY))
  })

  if (participant.fotoBuffer) {
    const photo = await loadImage(participant.fotoBuffer)
    drawCoverFit(ctx, photo, x(770), y(271), x(190), y(283))
  } else {
    ctx.fillStyle = '#e30613'
    ctx.fillRect(x(770), y(271), x(190), y(283))
    ctx.fillStyle = '#ffffff'
    ctx.font = `${y(24)}px Arial-Bold`
    ctx.textAlign = 'center'
    ctx.fillText('FOTO TIDAK ADA', x(865), y(413))
  }

  return canvas.toBuffer('image/png')
}

export async function generateKtaPdf({ namaSekolah, peserta }: KtaPdfParams) {
  if (peserta.length === 0) throw new Error('Sekolah belum memiliki peserta')

  const backTemplateBuffer = await readFile(path.join(process.cwd(), 'public', 'assets', 'template-kta-back.png'))
  const pdf = await PDFDocument.create()
  pdf.setTitle(`KTA PMR - ${namaSekolah}`)
  pdf.setSubject('Kartu Tanda Anggota Palang Merah Remaja')
  pdf.setProducer('Sistem Pendaftaran PMR 2026')

  // Urutan setiap peserta: depan lalu belakang, agar siap dicetak dua sisi.
  for (const participant of peserta) {
    const frontBuffer = await renderFront(namaSekolah, participant)
    const frontImage = await pdf.embedPng(frontBuffer)
    const frontPage = pdf.addPage([ID_CARD_WIDTH_PT, ID_CARD_HEIGHT_PT])
    frontPage.drawImage(frontImage, { x: 0, y: 0, width: ID_CARD_WIDTH_PT, height: ID_CARD_HEIGHT_PT })

    const backImage = await pdf.embedPng(backTemplateBuffer)
    const backPage = pdf.addPage([ID_CARD_WIDTH_PT, ID_CARD_HEIGHT_PT])
    backPage.drawImage(backImage, { x: 0, y: 0, width: ID_CARD_WIDTH_PT, height: ID_CARD_HEIGHT_PT })
  }

  return Buffer.from(await pdf.save())
}
