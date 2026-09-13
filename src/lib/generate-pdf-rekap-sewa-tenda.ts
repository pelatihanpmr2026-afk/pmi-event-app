import { REKAP_A4_W, REKAP_NAVY, REKAP_YELLOW, addRekapPage, createRekapPdf, drawPaginatedTable, drawText, rect, rp } from './pdf-rekap-text'
import type { PDFPage, PDFFont } from 'pdf-lib'
import type { RekapSewaTendaRow } from './rekap-sewa-tenda'

const TABLE_WIDTHS = [28, 80, 150, 145, 62, 90]
const TABLE_HEADERS = ['NO', 'NO. PENDAFTARAN', 'NAMA SEKOLAH', 'TENDA', 'JUMLAH', 'TOTAL BIAYA']

export interface RekapSewaTendaTotals {
  totalSekolah: number
  totalUnit: number
  totalBiaya: number
}

function toRows(rows: RekapSewaTendaRow[]): string[][] {
  return rows.map((row, index) => [
    String(index + 1),
    row.kodePendaftaran ?? '-',
    row.namaSekolah,
    row.tenda.map((t) => `${t.nama} x${t.jumlah}`).join(', ') || '-',
    `${row.totalUnit} unit`,
    rp(row.totalBiaya),
  ])
}

function drawSig(
  page: PDFPage,
  centerX: number,
  top: number,
  label: string,
  name: string | null,
  regular: PDFFont,
  bold: PDFFont
) {
  drawText(page, label, centerX, top, bold, 9, REKAP_NAVY, 'center')
  drawText(page, '______________________________________', centerX, top + 42, regular, 9, REKAP_NAVY, 'center')
  if (name) drawText(page, name, centerX, top + 56, bold, 10, REKAP_NAVY, 'center')
}

export async function generatePdfRekapSewaTenda(
  tanggal: string,
  kategori: 'WIRA' | 'MADYA',
  rows: RekapSewaTendaRow[],
  totals: RekapSewaTendaTotals,
  namaPetugas: string
): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf(`Rekap Sewa Tenda ${kategori}`)
  const createPage = () => addRekapPage(pdf, 'REKAP SEWA TENDA', tanggal, bold, regular)
  let page = createPage()

  drawText(page, `REKAP SEWA TENDA KATEGORI ${kategori}`, REKAP_A4_W / 2, 106, bold, 13, REKAP_NAVY, 'center')

  let y = 132
  ;({ page, top: y } = drawPaginatedTable({
    page,
    top: y,
    x: 20,
    widths: TABLE_WIDTHS,
    headers: TABLE_HEADERS,
    rows: toRows(rows),
    fonts: { regular, bold },
    createPage,
    continuationTitle: `REKAP SEWA TENDA ${kategori} - LANJUTAN`,
  }))

  y += 30
  if (y + 200 > 760) {
    page = createPage()
    y = 116
  }
  const summaryX = REKAP_A4_W - 20 - 300
  rect(page, summaryX, y - 14, 300, 82, REKAP_YELLOW)
  drawText(page, `TOTAL SEKOLAH : ${totals.totalSekolah}`, summaryX + 14, y, regular, 10)
  drawText(page, `TOTAL UNIT TENDA : ${totals.totalUnit}`, summaryX + 14, y + 22, regular, 10)
  drawText(page, `TOTAL BIAYA : ${rp(totals.totalBiaya)}`, summaryX + 14, y + 44, bold, 10)

  const sigCenter = REKAP_A4_W / 2 + 110
  drawSig(page, sigCenter, 690, 'Pembina PMR / Panitia', namaPetugas, regular, bold)

  return Buffer.from(await pdf.save())
}