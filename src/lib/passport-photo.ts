import sharp from 'sharp'
import { isLikelyNonRasterImage } from './normalize-image-buffer'

// 2cm x 3cm di resolusi 300 DPI (kualitas cetak) — proporsional 2:3
const TARGET_WIDTH = 236
const TARGET_HEIGHT = 354

/**
 * Crop (cover-fit) foto apapun rasionya menjadi rasio pas foto 2:3,
 * supaya saat ditempel ke Excel/dokumen lain ukurannya konsisten dan
 * tidak gepeng/melar.
 */
export async function cropToPassportPhoto(inputBuffer: Buffer): Promise<Buffer> {
  if (isLikelyNonRasterImage(inputBuffer)) {
    throw new Error('Invalid image buffer')
  }

  const meta = await sharp(inputBuffer, { failOn: 'none', limitInputPixels: 40_000_000 }).metadata()
  if (!meta.width || !meta.height) {
    throw new Error('Invalid image dimensions')
  }

  return sharp(inputBuffer, { failOn: 'none', limitInputPixels: 40_000_000 })
    .rotate()
    .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90 })
    .toBuffer()
}

/**
 * Versi aman untuk export Excel — tidak pernah throw.
 * Foto rusak/format tidak didukung dilewati tanpa menggagalkan export.
 */
export async function tryCropToPassportPhoto(inputBuffer: Buffer): Promise<Buffer | null> {
  if (!inputBuffer?.length) return null
  try {
    return await cropToPassportPhoto(inputBuffer)
  } catch {
    return null
  }
}

export const PASSPORT_PHOTO_ASPECT = { width: TARGET_WIDTH, height: TARGET_HEIGHT }
