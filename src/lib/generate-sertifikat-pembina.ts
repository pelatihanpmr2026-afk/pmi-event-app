import path from 'path'
import { readFile } from 'fs/promises'
import { PDFDocument, rgb, PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

const PAGE_WIDTH = 595.28 // A4 width in points
const PAGE_HEIGHT = 841.89 // A4 height in points

// Posisi baseline teks (dari bawah, dalam point) — diukur dari blank area template.
// Analisis piksel template 2482x3513: gap pembina full-y 1048-1300 (tengah 1174),
// gap sekolah full-y 1552-1840 (tengah 1696). Baseline = tengah gap - ~0.35x font.
const NAMA_PEMBINA_Y = 548
const NAMA_SEKOLAH_Y = 425
const TEXT_MAX_WIDTH = PAGE_WIDTH - 90

interface SertifikatParams {
  namaPembina: string
  namaSekolah: string
  /** Aset pre-load untuk batch: hindari baca file berulang per PDF. */
  assets?: {
    templateImage?: Buffer
    templateIsJpg?: boolean
    boldFontBytes?: Buffer
  }
}

/** Teks final persis seperti yang digambar di PDF — dipakai untuk subset font batch. */
export function formatSertifikatTexts(namaPembina: string, namaSekolah: string) {
  return {
    // Nama pembina WAJIB sama persis dengan data (tanpa ubah huruf besar/kecil)
    pembinaText: namaPembina.trim(),
    sekolahText: namaSekolah.trim().toLocaleUpperCase('id-ID'),
  }
}

function fitText(font: PDFFont, text: string, maxWidth: number, initialSize: number, minSize = 10) {
  let size = initialSize
  while (font.widthOfTextAtSize(text, size) > maxWidth && size > minSize) size -= 0.5
  return { text, size }
}

export async function generateSertifikatPembinaPdf({ namaPembina, namaSekolah, assets }: SertifikatParams): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const boldFontBytes = assets?.boldFontBytes ?? await readFile(path.join(process.cwd(), 'src', 'assets', 'fonts', 'Arial-Bold.ttf'))
  // subset:true → hanya glyph terpakai yang di-embed (±15KB vs ±700KB) + jauh lebih cepat.
  const boldFont = await pdf.embedFont(boldFontBytes, { subset: true })

  // Template final dari public/assets — sistem hanya menimpa 2 teks.
  // Nama file di repo: template_sertifkat.png (tanpa "i", ikuti nama asli).
  // Untuk batch (ZIP), panggil dengan assets.templateImage = JPEG downscale agar cepat & ringan.
  const templateBuffer = assets?.templateImage ?? await readFile(path.join(process.cwd(), 'public', 'assets', 'template_sertifkat.png'))
  const templateImage = assets?.templateIsJpg ? await pdf.embedJpg(templateBuffer) : await pdf.embedPng(templateBuffer)

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  page.drawImage(templateImage, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })

  const black = rgb(0, 0, 0)
  const centerX = PAGE_WIDTH / 2

  // <Nama_Pembina> — persis seperti data, bold, tengah
  const { pembinaText, sekolahText } = formatSertifikatTexts(namaPembina, namaSekolah)
  const pembinaFit = fitText(boldFont, pembinaText, TEXT_MAX_WIDTH, 34)
  const pembinaWidth = boldFont.widthOfTextAtSize(pembinaFit.text, pembinaFit.size)
  page.drawText(pembinaFit.text, {
    x: centerX - pembinaWidth / 2,
    y: NAMA_PEMBINA_Y,
    size: pembinaFit.size,
    font: boldFont,
    color: black,
  })

  // <NAMA_SEKOLAH> — UPPERCASE, bold, tengah
  const sekolahFit = fitText(boldFont, sekolahText, TEXT_MAX_WIDTH, 30)
  const sekolahWidth = boldFont.widthOfTextAtSize(sekolahFit.text, sekolahFit.size)
  page.drawText(sekolahFit.text, {
    x: centerX - sekolahWidth / 2,
    y: NAMA_SEKOLAH_Y,
    size: sekolahFit.size,
    font: boldFont,
    color: black,
  })

  pdf.setTitle(`Sertifikat Pembina - ${pembinaText}`)
  pdf.setSubject('Piagam Pembina PMR')

  return Buffer.from(await pdf.save())
}
