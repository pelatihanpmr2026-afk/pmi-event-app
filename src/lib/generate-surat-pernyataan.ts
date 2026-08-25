import { createCanvas, loadImage, SKRSContext2D } from '@napi-rs/canvas'
import { PDFDocument } from 'pdf-lib'
import { registerFonts } from './register-fonts'
import { saveBuffer } from './save-file'

const WIDTH = 900
// Rasio A4 portrait pada lebar kanvas 900 px. Tinggi dibuat tetap agar
// surat selalu menjadi tepat satu halaman PDF dan tidak memotong tanda tangan.
const HEIGHT = 1273
const MARGIN = 55
const NAVY = '#3653A5'

const PERNYATAAN_CONTENT = [
 'Data peserta, pendamping, dan sekolah yang diinput dalam formulir ini adalah benar, lengkap, dan dapat dipertanggungjawabkan oleh pihak sekolah.',
  'Pihak sekolah, melalui pembina/pelatih atau perwakilan yang melakukan pendaftaran, bertanggung jawab penuh atas kebenaran data, kondisi, kesiapan, serta keikutsertaan seluruh peserta dan pendamping yang didaftarkan.',
  'Apabila selama perjalanan, kedatangan, pelaksanaan, maupun kepulangan dari kegiatan terjadi kecelakaan, cedera, sakit, gangguan kesehatan, kehilangan, atau kejadian lain yang menimpa peserta, maka penanganan dan tanggung jawab selanjutnya dikembalikan kepada pihak sekolah dan/atau orang tua/wali peserta sesuai ketentuan yang berlaku.',
  'Panitia akan memberikan pertolongan dan penanganan awal apabila terjadi keadaan darurat selama kegiatan berlangsung, namun tanggung jawab lanjutan terhadap peserta, termasuk biaya pengobatan, perawatan, pemulangan, atau kebutuhan lainnya, menjadi tanggung jawab pihak sekolah dan/atau orang tua/wali peserta.',
  'Pihak sekolah wajib memastikan bahwa seluruh peserta telah memperoleh izin dari orang tua/wali, dalam kondisi sehat dan layak mengikuti kegiatan, serta memiliki perlengkapan dan kebutuhan pribadi yang diperlukan selama kegiatan.',
  'Biaya pendaftaran yang sudah dibayarkan tidak dapat dikembalikan (non-refundable), kecuali kegiatan dibatalkan sepenuhnya oleh panitia.',
  'Seluruh peserta dan pendamping wajib mengikuti rangkaian kegiatan sesuai jadwal dan ketentuan yang ditentukan oleh panitia.',
  'Panitia berhak melakukan verifikasi ulang terhadap data yang didaftarkan dan berhak menolak atau membatalkan pendaftaran apabila ditemukan ketidaksesuaian data atau peserta tidak memenuhi persyaratan kegiatan.',
  'Peserta dan pendamping wajib menjaga ketertiban, keamanan, keselamatan, serta mematuhi seluruh tata tertib yang berlaku selama kegiatan berlangsung.',
  'Panitia tidak bertanggung jawab atas kehilangan, kerusakan, atau tertinggalnya barang pribadi peserta maupun pendamping selama kegiatan berlangsung.',
  'Dengan menekan tombol "Setuju", pihak pendaftar menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan di atas serta menyatakan bahwa pihak sekolah bersedia bertanggung jawab atas peserta dan pendamping yang didaftarkan.'
]

function text(
  ctx: SKRSContext2D,
  s: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left'
) {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(s, x, y)
}

function wrapText(ctx: SKRSContext2D, str: string, maxWidth: number, font: string): string[] {
  ctx.font = font
  const words = str.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

interface Params {
  namaSekolah: string
  kodePendaftaran: string
  namaPembina: string
  divisi?: string
  tanggal: Date
  filename: string
  tandaTanganBuffer?: Buffer | null
}

export async function generateSuratPernyataan(params: Params): Promise<string> {
  registerFonts()

  const bodyFont = '12px Silkscreen'
  const lineHeight = 21
  const contentWidth = WIDTH - MARGIN * 2 - 20

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, WIDTH, 110)
  text(ctx, 'SURAT PERNYATAAN', WIDTH / 2, 45, '26px Silkscreen-Bold', '#FFFFFF', 'center')
  text(ctx, 'Pelantikan & Pelatihan PMR Se-Kabupaten Cianjur 2026', WIDTH / 2, 80, '14px Silkscreen', '#FDC20F', 'center')

  let y = 150

  const infoRows: [string, string][] = [
    ['Nama Sekolah', params.namaSekolah],
    ['Kode Pendaftaran', params.kodePendaftaran],
    ['Nama Pembina/Pelatih', params.namaPembina],
    [
      'Tanggal',
      params.tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    ],
  ]

  ctx.strokeStyle = NAVY
  ctx.lineWidth = 3
  ctx.strokeRect(MARGIN, y, WIDTH - MARGIN * 2, infoRows.length * 32 + 16)
  y += 28
  for (const [label, value] of infoRows) {
    text(ctx, label, MARGIN + 20, y, '13px Silkscreen', '#6B7280')
    text(ctx, value, WIDTH - MARGIN - 20, y, 'bold 14px Silkscreen-Bold', NAVY, 'right')
    y += 32
  }

  y += 36

  text(
    ctx,
    'Yang bertanda tangan di bawah ini menyatakan bahwa:',
    MARGIN,
    y,
    'bold 13px Silkscreen-Bold',
    NAVY
  )
  y += 30

  PERNYATAAN_CONTENT.forEach((point, i) => {
    const lines = wrapText(ctx, point, contentWidth, bodyFont)
    text(ctx, `${i + 1}.`, MARGIN, y, bodyFont, NAVY)
    lines.forEach((line, li) => {
      text(ctx, line, MARGIN + 26, y + li * lineHeight, bodyFont, NAVY)
    })
    y += lines.length * lineHeight + 8
  })

  y += 20
  text(
    ctx,
    'Dengan ini kami menyatakan kesediaan untuk mematuhi seluruh ketentuan di atas.',
    MARGIN,
    y,
    '12px Silkscreen',
    NAVY
  )

  y += 68

  const sigBlockWidth = 280
  const sigX = WIDTH - MARGIN - sigBlockWidth
  text(ctx, `Cianjur, ${params.tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, sigX + sigBlockWidth / 2, y, '12px Silkscreen', NAVY, 'center')

  // Tanda tangan diletakkan tepat setelah tempat/tanggal dan sebelum jabatan.
  const signatureBoxY = y + 18
  const signatureMaxHeight = 84
  if (params.tandaTanganBuffer) {
    try {
      const signature = await loadImage(params.tandaTanganBuffer)
      const maxWidth = sigBlockWidth - 48
      const ratio = Math.min(maxWidth / signature.width, signatureMaxHeight / signature.height)
      const width = signature.width * ratio
      const height = signature.height * ratio
      ctx.drawImage(signature, sigX + (sigBlockWidth - width) / 2, signatureBoxY + (signatureMaxHeight - height) / 2, width, height)
    } catch {
      // Tanda tangan gagal dimuat; PDF tetap dibuat dengan kolom tanda tangan kosong.
    }
  }
  y = signatureBoxY + signatureMaxHeight + 20
  text(ctx, params.namaPembina, sigX + sigBlockWidth / 2, y, 'bold 13px Silkscreen-Bold', NAVY, 'center')
  y += 27
  text(ctx, '( _______________________ )', sigX + sigBlockWidth / 2, y, '14px Silkscreen', '#6B7280', 'center')
  y += 18
  text(ctx, 'Penanggung Jawab Sekolah,', sigX + sigBlockWidth / 2, y, '12px Silkscreen', NAVY, 'center')
  

  const pngBuffer = canvas.toBuffer('image/png')
  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(`Surat Pernyataan ${params.kodePendaftaran}`)
  const img = await pdfDoc.embedPng(pngBuffer)
  const page = pdfDoc.addPage([WIDTH, HEIGHT])
  page.drawImage(img, { x: 0, y: 0, width: WIDTH, height: HEIGHT })
  const bytes = await pdfDoc.save()

  return saveBuffer(Buffer.from(bytes), 'surat-pernyataan', params.filename)
}
