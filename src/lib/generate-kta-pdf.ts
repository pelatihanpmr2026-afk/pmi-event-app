import path from 'path'
import { readFile } from 'fs/promises'
import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas'
import { PDFDocument } from 'pdf-lib'
import { registerFonts } from './register-fonts'

const WIDTH = 1019
const HEIGHT = 643
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
  const template = await loadImage(path.join(process.cwd(), 'public', 'assets', 'template-kta-front.png'))
  ctx.drawImage(template, 0, 0, WIDTH, HEIGHT)

  // Menutup placeholder pada template dengan panel yang tetap menyatu dengan foto latar.
  ctx.fillStyle = 'rgba(30, 18, 15, 1)'
  ctx.fillRect(20, 292, 690, 276)
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  const schoolName = namaSekolah.toUpperCase()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(18, 102, 500, 62)
  fitFont(ctx, schoolName, 475, 39, 'Arial-Bold')
  ctx.fillStyle = '#e30613'
  ctx.fillText(schoolName, 24, 122)

  const values = [
    ['No. Reg. Induk', participant.noPeserta ?? '-'],
    ['Nama', participant.namaLengkap],
    ['TTL', `${participant.tempatLahir}, ${formatTanggalLahir(participant.tanggalLahir)}`],
    ['Gol Darah', formatEnum(participant.golonganDarah)],
    ['Agama', formatEnum(participant.agama)],
    ['Unit Sekolah', namaSekolah],
    ['Alamat', participant.alamat],
  ]

  values.forEach(([label, value], index) => {
    const y = 314 + index * 35
    ctx.font = '27px Arial'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, 38, y)
    ctx.fillText(':', 270, y)
    const valueSize = fitFont(ctx, value, 400, 27, 'Arial')
    ctx.font = `${valueSize}px Arial`
    ctx.fillText(value, 300, y)
  })

  if (participant.fotoBuffer) {
    const photo = await loadImage(participant.fotoBuffer)
    drawCoverFit(ctx, photo, 731, 271, 224, 332)
  } else {
    ctx.fillStyle = '#e30613'
    ctx.fillRect(731, 271, 224, 332)
    ctx.fillStyle = '#ffffff'
    ctx.font = '24px Arial-Bold'
    ctx.textAlign = 'center'
    ctx.fillText('FOTO TIDAK ADA', 843, 437)
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
