import { REKAP_A4_W, REKAP_NAVY, REKAP_YELLOW, addRekapPage, createRekapPdf, drawPaginatedTable, drawText, rect } from './pdf-rekap-text'
import type { PDFPage, PDFFont } from 'pdf-lib'
import type { RekapDataSekolahRow } from './rekap-data-sekolah'

const TABLE_WIDTHS = [30, 90, 210, 110, 105]
const TABLE_HEADERS = ['NO', 'NO. PENDAFTARAN', 'NAMA SEKOLAH', 'JUMLAH PESERTA', 'JUMLAH PENDAMPING']

export interface RekapSekolahTotals {
  totalSekolah: number
  totalPeserta: number
  totalPendamping: number
}

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

export async function generatePdfRekapDataSekolah(
  tanggal: string,
  kategori: 'WIRA' | 'MADYA',
  rows: RekapDataSekolahRow[],
  totals: RekapSekolahTotals,
  namaPetugas: string
): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf(`Rekap Data Sekolah ${kategori}`)
  const createPage = () => addRekapPage(pdf, 'REKAP DATA SEKOLAH', tanggal, bold, regular)
  let page = createPage()

  drawText(page, `REKAP SEKOLAH ${kategori}`, REKAP_A4_W / 2, 106, bold, 13, REKAP_NAVY, 'center')

  let y = 132
  ;({ page, top: y } = drawPaginatedTable({
    page, top: y, x: 20, widths: TABLE_WIDTHS,
    headers: TABLE_HEADERS,
    rows: toRows(rows),
    fonts: { regular, bold },
    createPage, continuationTitle: `REKAP SEKOLAH ${kategori} - LANJUTAN`,
  }))

  y += 30
  if (y + 180 > 760) { page = createPage(); y = 116 }
  const summaryX = REKAP_A4_W - 20 - 300
  rect(page, summaryX, y - 14, 300, 82, REKAP_YELLOW)
  drawText(page, `TOTAL SEKOLAH : ${totals.totalSekolah}`, summaryX + 14, y, regular, 10)
  drawText(page, `TOTAL PESERTA : ${totals.totalPeserta}`, summaryX + 14, y + 22, regular, 10)
  drawText(page, `TOTAL PENDAMPING : ${totals.totalPendamping}`, summaryX + 14, y + 44, bold, 10)

  return Buffer.from(await pdf.save())
}