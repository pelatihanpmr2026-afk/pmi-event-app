import { createCanvas, loadImage } from '@napi-rs/canvas'

// 2cm x 3cm di resolusi 300 DPI (kualitas cetak) — proporsional 2:3
const TARGET_WIDTH = 236
const TARGET_HEIGHT = 354

/**
 * Crop (cover-fit) foto apapun rasionya menjadi rasio pas foto 2:3,
 * supaya saat ditempel ke Excel/dokumen lain ukurannya konsisten dan
 * tidak gepeng/melar.
 */
export async function cropToPassportPhoto(inputBuffer: Buffer): Promise<Buffer> {
  const img = await loadImage(inputBuffer)

  const canvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT)
  const ctx = canvas.getContext('2d')

  const targetRatio = TARGET_WIDTH / TARGET_HEIGHT
  const imgRatio = img.width / img.height

  let drawW: number, drawH: number, offsetX: number, offsetY: number

  if (imgRatio > targetRatio) {
    drawH = TARGET_HEIGHT
    drawW = TARGET_HEIGHT * imgRatio
    offsetX = (TARGET_WIDTH - drawW) / 2
    offsetY = 0
  } else {
    drawW = TARGET_WIDTH
    drawH = TARGET_WIDTH / imgRatio
    offsetX = 0
    offsetY = (TARGET_HEIGHT - drawH) / 2
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH)

  return canvas.toBuffer('image/jpeg', 90)
}

export const PASSPORT_PHOTO_ASPECT = { width: TARGET_WIDTH, height: TARGET_HEIGHT }