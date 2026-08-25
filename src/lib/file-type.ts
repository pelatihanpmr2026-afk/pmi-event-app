/**
 * Deteksi tipe file dari "magic bytes" (signature biner), bukan dari ekstensi
 * atau MIME yang diklaim klien. Dipakai untuk validasi ulang file tersimpan
 * (stored-file hardening, R5).
 */

export type DetectedFileType = 'png' | 'jpeg' | 'webp' | 'pdf' | 'xlsx'

export function detectFileType(buffer: Buffer | Uint8Array): DetectedFileType | null {
  const b = buffer instanceof Buffer ? buffer : Buffer.from(buffer)
  if (b.length < 4) return null

  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'

  // WEBP: "RIFF" .... "WEBP"
  if (
    b.length >= 12 &&
    b.toString('latin1', 0, 4) === 'RIFF' &&
    b.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }

  // PDF: "%PDF"
  if (
    b[0] === 0x25 &&
    b[1] === 0x50 &&
    b[2] === 0x44 &&
    b[3] === 0x46
  ) {
    return 'pdf'
  }

  // XLSX (dan DOCX/ZIP pada umumnya): "PK\x03\x04"
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'xlsx'

  return null
}

/** Tipe yang diharapkan dari ekstensi file (untuk dibandingkan dengan magic bytes). */
export function expectedTypeFromExt(filename: string): DetectedFileType | null {
  const ext = filename.toLowerCase().replace(/^.*\./, '')
  switch (ext) {
    case 'png':
      return 'png'
    case 'jpg':
    case 'jpeg':
      return 'jpeg'
    case 'webp':
      return 'webp'
    case 'pdf':
      return 'pdf'
    case 'xlsx':
      return 'xlsx'
    default:
      return null
  }
}

/**
 * Validasi: bila ekstensi menunjuk tipe yang dikenal, isi file harus cocok.
 * `strict` = tolak juga file yang isinya tidak dikenali sama sekali
 * (bukan tipe yang kita dukung).
 */
export function validateFileContent(
  buffer: Buffer | Uint8Array,
  filename: string,
  opts: { strict?: boolean } = {}
): boolean {
  const expected = expectedTypeFromExt(filename)
  if (!expected) return true // ekstensi di luar domain — tidak bisa divalidasi
  const actual = detectFileType(buffer)
  if (actual === expected) return true
  if (!actual && !opts.strict) return true // isi tak dikenal, biarkan lintas
  return false
}