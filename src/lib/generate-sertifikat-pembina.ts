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
}

function titleCase(value: string) {
  return value.toLocaleLowerCase('id-ID').replace(/(^|[\s/-])[a-zà-ÿ]/g, (letter) => letter.toLocaleUpperCase('id-ID'))
}

function fitText(font: PDFFont, text: string, maxWidth: number, initialSize: number, minSize = 10) {
  let size = initialSize
  while (font.widthOfTextAtSize(text, size) > maxWidth && size > minSize) size -= 0.5
  return { text, size }
}

export async function generateSertifikatPembinaPdf({ namaPembina, namaSekolah }: SertifikatParams): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const boldFont = await pdf.embedFont(await readFile(path.join(process.cwd(), 'src', 'assets', 'fonts', 'Arial-Bold.ttf')))

  // Template final dari public/assets — sistem hanya menimpa 2 teks.
  // Nama file di repo: template_sertifkat.png (tanpa "i", ikuti nama asli).
  const templateBuffer = await readFile(path.join(process.cwd(), 'public', 'assets', 'template_sertifkat.png'))
  const templateImage = await pdf.embedPng(templateBuffer)

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  page.drawImage(templateImage, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })

  const black = rgb(0, 0, 0)
  const centerX = PAGE_WIDTH / 2

  // <Nama_Pembina> — Title Case, bold, tengah
  const pembinaText = titleCase(namaPembina.trim())
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
  const sekolahText = namaSekolah.trim().toLocaleUpperCase('id-ID')
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
