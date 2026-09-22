import path from 'path'
import { readFile } from 'fs/promises'
import { PDFDocument, PDFPage, rgb, PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

const PAGE_WIDTH = 595.28 // A4 width in points
const PAGE_HEIGHT = 841.89 // A4 height in points

interface SertifikatParams {
  namaPembina: string
  namaSekolah: string
}

function titleCase(value: string) {
  return value.toLocaleLowerCase('id-ID').replace(/(^|[\s/-])[a-zà-ÿ]/g, (letter) => letter.toLocaleUpperCase('id-ID'))
}

function fitText(font: PDFFont, text: string, maxWidth: number, initialSize: number) {
  let size = initialSize
  while (font.widthOfTextAtSize(text, size) > maxWidth && size > 8) size -= 0.5
  return { text, size }
}

export async function generateSertifikatPembinaPdf({ namaPembina, namaSekolah }: SertifikatParams): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const [regularFont, boldFont] = await Promise.all([
    pdf.embedFont(await readFile(path.join(process.cwd(), 'src', 'assets', 'fonts', 'Arial-Regular.ttf'))),
    pdf.embedFont(await readFile(path.join(process.cwd(), 'src', 'assets', 'fonts', 'Arial-Bold.ttf'))),
  ])

  const page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const centerX = PAGE_WIDTH / 2
  const red = rgb(0.89, 0.024, 0.075)
  const black = rgb(0, 0, 0)

  // Red top bar
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 20, width: PAGE_WIDTH, height: 20, color: red })

  // Title: PIAGAM
  const titleSize = 48
  const titleWidth = boldFont.widthOfTextAtSize('PIAGAM', titleSize)
  page.drawText('PIAGAM', {
    x: centerX - titleWidth / 2,
    y: PAGE_HEIGHT - 120,
    size: titleSize,
    font: boldFont,
    color: black,
  })

  // Number
  const nomor = '055/02.03.15/PMR/IX/2026'
  const nomorSize = 14
  const nomorWidth = regularFont.widthOfTextAtSize(nomor, nomorSize)
  page.drawText(nomor, {
    x: centerX - nomorWidth / 2,
    y: PAGE_HEIGHT - 145,
    size: nomorSize,
    font: regularFont,
    color: black,
  })

  // DIBERIKAN KEPADA
  const diberikanSize = 14
  const diberikanText = 'DIBERIKAN KEPADA'
  const diberikanWidth = boldFont.widthOfTextAtSize(diberikanText, diberikanSize)
  page.drawText(diberikanText, {
    x: centerX - diberikanWidth / 2,
    y: PAGE_HEIGHT - 190,
    size: diberikanSize,
    font: boldFont,
    color: black,
  })

  // Nama Pembina (large)
  const namaPembinaFit = fitText(boldFont, titleCase(namaPembina), PAGE_WIDTH - 100, 36)
  const namaPembinaWidth = boldFont.widthOfTextAtSize(namaPembinaFit.text, namaPembinaFit.size)
  page.drawText(namaPembinaFit.text, {
    x: centerX - namaPembinaWidth / 2,
    y: PAGE_HEIGHT - 240,
    size: namaPembinaFit.size,
    font: boldFont,
    color: black,
  })

  // Sebagai
  const sebagaiSize = 14
  const sebagaiText = 'Sebagai'
  const sebagaiWidth = regularFont.widthOfTextAtSize(sebagaiText, sebagaiSize)
  page.drawText(sebagaiText, {
    x: centerX - sebagaiWidth / 2,
    y: PAGE_HEIGHT - 275,
    size: sebagaiSize,
    font: regularFont,
    color: black,
  })

  // PEMBINA PMR
  const pembinaPmrSize = 28
  const pembinaPmrText = 'PEMBINA PMR'
  const pembinaPmrWidth = boldFont.widthOfTextAtSize(pembinaPmrText, pembinaPmrSize)
  page.drawText(pembinaPmrText, {
    x: centerX - pembinaPmrWidth / 2,
    y: PAGE_HEIGHT - 320,
    size: pembinaPmrSize,
    font: boldFont,
    color: black,
  })

  // Nama Sekolah (large, uppercase)
  const namaSekolahUpper = namaSekolah.toUpperCase()
  const namaSekolahFit = fitText(boldFont, namaSekolahUpper, PAGE_WIDTH - 100, 28)
  const namaSekolahWidth = boldFont.widthOfTextAtSize(namaSekolahFit.text, namaSekolahFit.size)
  page.drawText(namaSekolahFit.text, {
    x: centerX - namaSekolahWidth / 2,
    y: PAGE_HEIGHT - 360,
    size: namaSekolahFit.size,
    font: boldFont,
    color: black,
  })

  // Horizontal line
  page.drawLine({
    start: { x: 80, y: PAGE_HEIGHT - 390 },
    end: { x: PAGE_WIDTH - 80, y: PAGE_HEIGHT - 390 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  })

  // Activity description
  const activityLines = [
    'Dalam kegiatan',
    'Pelatihan dan Pelantikan PMR Tingkat Madya dan Wira',
    'se-Kabupaten Cianjur',
  ]
  let activityY = PAGE_HEIGHT - 430
  for (const line of activityLines) {
    const lineSize = 13
    const lineWidth = regularFont.widthOfTextAtSize(line, lineSize)
    page.drawText(line, {
      x: centerX - lineWidth / 2,
      y: activityY,
      size: lineSize,
      font: regularFont,
      color: black,
    })
    activityY -= 22
  }

  // Date and location
  const dateLines = [
    'Yang dilaksanakan pada 18-20 September 2026',
    'di Bumi Perkemahan Mandala Kitri, Cibodas, Cianjur - Jawa Barat',
  ]
  let dateY = activityY - 20
  for (const line of dateLines) {
    const lineSize = 12
    const lineWidth = regularFont.widthOfTextAtSize(line, lineSize)
    page.drawText(line, {
      x: centerX - lineWidth / 2,
      y: dateY,
      size: lineSize,
      font: regularFont,
      color: black,
    })
    dateY -= 20
  }

  // Signature section
  const sigY = dateY - 40
  const kotaDate = 'Cianjur, 20 September 2026'
  const kotaDateSize = 12
  const kotaDateWidth = regularFont.widthOfTextAtSize(kotaDate, kotaDateSize)
  page.drawText(kotaDate, {
    x: centerX - kotaDateWidth / 2,
    y: sigY,
    size: kotaDateSize,
    font: regularFont,
    color: black,
  })

  const pengurusText = 'Pengurus'
  const pengurusSize = 12
  const pengurusWidth = regularFont.widthOfTextAtSize(pengurusText, pengurusSize)
  page.drawText(pengurusText, {
    x: centerX - pengurusWidth / 2,
    y: sigY - 25,
    size: pengurusSize,
    font: regularFont,
    color: black,
  })

  const pmiText = 'PALANG MERAH INDONESIA'
  const pmiSize = 12
  const pmiWidth = boldFont.widthOfTextAtSize(pmiText, pmiSize)
  page.drawText(pmiText, {
    x: centerX - pmiWidth / 2,
    y: sigY - 42,
    size: pmiSize,
    font: boldFont,
    color: black,
  })

  // Try to add stamp image
  try {
    const stampPath = path.join(process.cwd(), 'public', 'assets', 'stamp_pmi.png')
    const stampBuffer = await readFile(stampPath)
    const stampImage = await pdf.embedPng(stampBuffer)
    const stampWidth = 120
    const stampHeight = 120
    page.drawImage(stampImage, {
      x: centerX - stampWidth / 2,
      y: sigY - 42 - stampHeight - 10,
      width: stampWidth,
      height: stampHeight,
    })
  } catch {
    // Stamp image not found, skip
  }

  const penanggungText = 'Ahmad Fikri'
  const penanggungSize = 12
  const penanggungWidth = regularFont.widthOfTextAtSize(penanggungText, penanggungSize)
  page.drawText(penanggungText, {
    x: centerX - penanggungWidth / 2,
    y: sigY - 180,
    size: penanggungSize,
    font: regularFont,
    color: black,
  })

  // Footer
  const footerY = 40
  const footerLine1 = 'Palang Merah Indonesia Kabupaten Cianjur'
  const footerLine1Size = 9
  const footerLine1Width = boldFont.widthOfTextAtSize(footerLine1, footerLine1Size)
  page.drawText(footerLine1, {
    x: centerX - footerLine1Width / 2,
    y: footerY,
    size: footerLine1Size,
    font: boldFont,
    color: red,
  })

  const footerLine2 = 'Jl.Pangeran Hidayatulloh No.45A Phone/Fax : (0263) 261565 Cianjur'
  const footerLine2Size = 8
  const footerLine2Width = regularFont.widthOfTextAtSize(footerLine2, footerLine2Size)
  page.drawText(footerLine2, {
    x: centerX - footerLine2Width / 2,
    y: footerY - 14,
    size: footerLine2Size,
    font: regularFont,
    color: black,
  })

  return Buffer.from(await pdf.save())
}
