import { REKAP_A4_W, REKAP_NAVY, REKAP_YELLOW, addRekapPage, createRekapPdf, drawPaginatedTable, drawText, rect } from './pdf-rekap-text'
import type { PDFPage, PDFFont } from 'pdf-lib'
import type { RekapDataSekolahRow, RekapDataSekolahTotals } from './rekap-data-sekolah'

const TABLE_WIDTHS = [30, 90, 210, 110, 105]
const TABLE_HEADERS = ['NO', 'NO. PENDAFTARAN', 'NAMA SEKOLAH', 'JUMLAH PESERTA', 'JUMLAH PENDAMPING']

function toRows(rows: RekapDataSekolahRow[]): string[][] {
  return rows.map((row, index) => [
    String(index + 1),
    row.nomorPendaftaran ? String(row.nomorPendaftaran) : '-',
    row.namaSekolah,
    String(row.jumlahPeserta),
    String(row.jumlahPendamping),
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

function sectionTitle(page: PDFPage, text: string, y: number, bold: PDFFont) {
  drawText(page, text, REKAP_A4_W / 2, y, bold, 13, REKAP_NAVY, 'center')
  return y + 26
}

export async function generatePdfRekapDataSekolah(
  tanggal: string,
  wira: RekapDataSekolahRow[],
  madya: RekapDataSekolahRow[],
  totals: RekapDataSekolahTotals,
  namaPetugas: string
): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf('Rekap Data Sekolah')
  const createPage = () => addRekapPage(pdf, 'REKAP DATA SEKOLAH', tanggal, bold, regular)
  let page = createPage()
  let y = sectionTitle(page, 'REKAP SEKOLAH WIRA', 106, bold)

  ;({ page, top: y } = drawPaginatedTable({
    page, top: y, x: 20, widths: TABLE_WIDTHS,
    headers: TABLE_HEADERS,
    rows: toRows(wira),
    fonts: { regular, bold },
    createPage, continuationTitle: 'REKAP SEKOLAH WIRA - LANJUTAN',
  }))

  y += 26
  if (y + 30 > 760) { page = createPage(); y = 116 }
  y = sectionTitle(page, 'REKAP SEKOLAH MADYA', y, bold)

  ;({ page, top: y } = drawPaginatedTable({
    page, top: y, x: 20, widths: TABLE_WIDTHS,
    headers: TABLE_HEADERS,
    rows: toRows(madya),
    fonts: { regular, bold },
    createPage, continuationTitle: 'REKAP SEKOLAH MADYA - LANJUTAN',
  }))

  y += 30
  if (y + 190 > 760) { page = createPage(); y = 116 }
  const summaryX = REKAP_A4_W - 20 - 300
  rect(page, summaryX, y - 14, 300, 150, REKAP_YELLOW)
  drawText(page, `TOTAL SEKOLAH WIRA : ${totals.totalSekolahWira}`, summaryX + 14, y, regular, 10)
  drawText(page, `TOTAL SEKOLAH MADYA : ${totals.totalSekolahMadya}`, summaryX + 14, y + 22, regular, 10)
  drawText(page, `TOTAL PESERTA WIRA : ${totals.totalPesertaWira}`, summaryX + 14, y + 44, regular, 10)
  drawText(page, `TOTAL PESERTA MADYA : ${totals.totalPesertaMadya}`, summaryX + 14, y + 66, regular, 10)
  drawText(page, `TOTAL PENDAMPING WIRA : ${totals.totalPendampingWira}`, summaryX + 14, y + 88, regular, 10)
  drawText(page, `TOTAL PENDAMPING MADYA : ${totals.totalPendampingMadya}`, summaryX + 14, y + 110, bold, 10)
  y += 150

  return Buffer.from(await pdf.save())
}