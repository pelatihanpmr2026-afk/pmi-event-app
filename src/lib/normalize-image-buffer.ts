import sharp from 'sharp'

/** Deteksi buffer yang jelas bukan raster (SVG/HTML/XML/kosong). */
export function isLikelyNonRasterImage(buffer: Buffer): boolean {
  if (!buffer?.length || buffer.length < 4) return true

  const head = buffer.subarray(0, Math.min(512, buffer.length)).toString('utf8').trimStart()
  if (head.startsWith('<') || head.startsWith('<?')) return true

  // Magic bytes raster umum
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  const isWebp =
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  const isGif = buffer.toString('ascii', 0, 3) === 'GIF'

  return !(isJpeg || isPng || isWebp || isGif)
}

/**
 * Normalisasi foto peserta ke JPEG saat upload.
 * Menolak file non-raster; toleran terhadap JPEG/PNG sedikit korup.
 */
export async function normalizeParticipantPhotoBuffer(buffer: Buffer): Promise<Buffer> {
  if (isLikelyNonRasterImage(buffer)) {
    throw new Error('Format foto tidak valid. Gunakan JPG atau PNG.')
  }

  const normalized = await sharp(buffer, { failOn: 'none', limitInputPixels: 40_000_000 })
    .rotate()
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer()

  const meta = await sharp(normalized).metadata()
  if (!meta.width || !meta.height) {
    throw new Error('Format foto tidak valid. Gunakan JPG atau PNG.')
  }

  return normalized
}
