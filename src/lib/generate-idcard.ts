import path from 'path'
import { createCanvas, loadImage, GlobalFonts, SKRSContext2D } from '@napi-rs/canvas'
import { ID_CARD_LAYOUT } from './idcard-layout'
import { saveBuffer } from './save-file'
import { registerFonts } from './register-fonts'

function wrapAndFitText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
  baseFontSize: number,
  fontFamily: string
): number {
  let fontSize = baseFontSize
  ctx.font = `${fontSize}px ${fontFamily}`

  while (ctx.measureText(text).width > maxWidth && fontSize > 8) {
    fontSize -= 1
    ctx.font = `${fontSize}px ${fontFamily}`
  }

  return fontSize
}

interface GenerateIdCardParams {
  fotoPath: string // absolute path ke foto panitia yang sudah tersimpan
  qrCodePath: string // absolute path ke QR Code yang sudah di-generate
  nama: string
  divisiLabel: string
  filename: string
}

export async function generateIdCard({
  fotoPath,
  qrCodePath,
  nama,
  divisiLabel,
  filename,
}: GenerateIdCardParams): Promise<string> {
  registerFonts()

  const { templateWidth, templateHeight, outputScale, photoBox, qrBox, nameText, divisionText } =
    ID_CARD_LAYOUT

  const outputWidth = templateWidth * outputScale
  const outputHeight = templateHeight * outputScale

  const canvas = createCanvas(outputWidth, outputHeight)
  const ctx = canvas.getContext('2d')

  // 1. Gambar template dasar
  ctx.imageSmoothingEnabled = false
  const templatePath = path.join(process.cwd(), 'public', 'assets', 'template-idcard.png')
  const templateImg = await loadImage(templatePath)
  ctx.drawImage(templateImg, 0, 0, outputWidth, outputHeight)

  // 2. Gambar foto panitia (cover-fit ke dalam photo box)
  const photoImg = await loadImage(fotoPath)

  const photoBoxX = photoBox.xPct * outputWidth
  const photoBoxY = photoBox.yPct * outputHeight
  const photoBoxW = photoBox.widthPct * outputWidth
  const photoBoxH = photoBox.heightPct * outputHeight

  const imgRatio = photoImg.width / photoImg.height
  const boxRatio = photoBoxW / photoBoxH

  let drawW: number, drawH: number, offsetX: number, offsetY: number

  if (imgRatio > boxRatio) {
    drawH = photoBoxH
    drawW = photoBoxH * imgRatio
    offsetX = (photoBoxW - drawW) / 2
    offsetY = 0
  } else {
    drawW = photoBoxW
    drawH = photoBoxW / imgRatio
    offsetX = 0
    offsetY = (photoBoxH - drawH) / 2
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(photoBoxX, photoBoxY, photoBoxW, photoBoxH)
  ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(photoImg, photoBoxX + offsetX, photoBoxY + offsetY, drawW, drawH)
  ctx.restore()

  // 3. Gambar QR Code (contain-fit + padding, supaya QR utuh & tetap bisa discan)
  const qrImg = await loadImage(qrCodePath)

  const qrBoxX = qrBox.xPct * outputWidth
  const qrBoxY = qrBox.yPct * outputHeight
  const qrBoxW = qrBox.widthPct * outputWidth
  const qrBoxH = qrBox.heightPct * outputHeight
  const qrPadding = qrBoxW * qrBox.paddingPct

  const qrInnerW = qrBoxW - qrPadding * 2
  const qrInnerH = qrBoxH - qrPadding * 2
  const qrSize = Math.min(qrInnerW, qrInnerH)
  const qrOffsetX = (qrBoxW - qrSize) / 2
  const qrOffsetY = (qrBoxH - qrSize) / 2

  ctx.imageSmoothingEnabled = false // QR Code harus tajam, tidak boleh di-blur
  ctx.drawImage(qrImg, qrBoxX + qrOffsetX, qrBoxY + qrOffsetY, qrSize, qrSize)

  // 4. Tulis Nama
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const nameMaxWidth = nameText.maxWidthPct * outputWidth
  const nameBaseFontSize = nameText.fontSizePct * outputHeight
  const nameFontSize = wrapAndFitText(
    ctx,
    nama.toUpperCase(),
    nameMaxWidth,
    nameBaseFontSize,
    'Silkscreen-Bold'
  )
  ctx.font = `${nameFontSize}px Silkscreen-Bold`
  ctx.fillStyle = nameText.color
  ctx.fillText(nama.toUpperCase(), outputWidth / 2, nameText.centerYPct * outputHeight)

  // 5. Tulis Divisi
  const divisiMaxWidth = divisionText.maxWidthPct * outputWidth
  const divisiBaseFontSize = divisionText.fontSizePct * outputHeight
  const divisiFontSize = wrapAndFitText(
    ctx,
    divisiLabel.toUpperCase(),
    divisiMaxWidth,
    divisiBaseFontSize,
    'Silkscreen-Bold'
  )
  ctx.font = `${divisiFontSize}px Silkscreen-Bold`
  ctx.fillStyle = divisionText.color
  ctx.fillText(divisiLabel.toUpperCase(), outputWidth / 2, divisionText.centerYPct * outputHeight)

  // 6. Export ke buffer PNG dan simpan
  const buffer = canvas.toBuffer('image/png')
  return saveBuffer(buffer, 'idcards', filename)
}