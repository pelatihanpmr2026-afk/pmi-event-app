import { addRekapPage, createRekapPdf, drawPaginatedTable, drawText, rect, REKAP_A4_W, REKAP_NAVY, REKAP_YELLOW, rp } from './pdf-rekap-text'
import type { PDFPage, PDFFont } from 'pdf-lib'

interface PendaftaranRow { namaSekolah: string; jumlahPeserta: number; jumlahPendamping: number; totalRp: number }
interface TendaRow { namaSekolah: string; namaTenda: string; jumlahTenda: number; totalRp: number }

function drawSig(
  page: PDFPage,
  x: number,
  top: number,
  label: string,
  name: string | null,
  regular: PDFFont,
  bold: PDFFont
) {
  drawText(page, label, x, top, bold, 9, REKAP_NAVY)
  drawText(page, '_______________________', x, top + 45, regular, 10, REKAP_NAVY)
  if (name) drawText(page, name, x, top + 60, bold, 10, REKAP_NAVY)
}

export async function generatePdfRekapPendaftaran(
  tanggal: string,
  pendaftaran: PendaftaranRow[],
  tenda: TendaRow[],
  totals: { totalJumlahPeserta: number; totalJumlahPendamping: number; totalJumlahTenda: number; totalPendaftaran: number; totalSewaTenda: number; totalKeseluruhan: number },
  namaPetugas: string
): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf(`Rekap Pendaftaran ${tanggal}`)
  const createPage = () => addRekapPage(pdf, 'REKAP PENDAFTARAN HARIAN', tanggal, bold, regular)
  let page = createPage()
  const pendaftaranTable = drawPaginatedTable({
    page, top: 116, x: 20, widths: [30, 190, 105, 115, 115],
    headers: ['NO', 'NAMA SEKOLAH', 'JUMLAH PESERTA', 'JUMLAH PENDAMPING', 'TOTAL (RP.)'],
    rows: pendaftaran.map((row, index) => [String(index + 1), row.namaSekolah, String(row.jumlahPeserta), String(row.jumlahPendamping), rp(row.totalRp)]),
    fonts: { regular, bold }, totalRow: ['', 'TOTAL', String(totals.totalJumlahPeserta), String(totals.totalJumlahPendamping), rp(totals.totalPendaftaran)], rowHeight: 24,
    createPage, continuationTitle: 'REKAP PENDAFTARAN - LANJUTAN',
  })
  page = pendaftaranTable.page
  let y = pendaftaranTable.top
  if (y + 90 > 760) { page = createPage(); y = 116 }
  y += 40
  drawText(page, 'REKAP HARIAN SEWA TENDA', REKAP_A4_W / 2, y, bold, 13, REKAP_NAVY, 'center')
  y += 26
  ;({ page, top: y } = drawPaginatedTable({
    page, top: y, x: 20, widths: [30, 190, 135, 100, 100],
    headers: ['NO', 'NAMA SEKOLAH', 'NAMA TENDA', 'JUMLAH TENDA', 'TOTAL (RP.)'],
    rows: tenda.map((row, index) => [String(index + 1), row.namaSekolah, row.namaTenda, String(row.jumlahTenda), rp(row.totalRp)]),
    fonts: { regular, bold }, totalRow: ['', '', 'TOTAL', String(totals.totalJumlahTenda), rp(totals.totalSewaTenda)], rowHeight: 24,
    createPage, continuationTitle: 'REKAP SEWA TENDA - LANJUTAN',
  }))
  if (y + 142 > 760) { page = createPage(); y = 116 }
  y += 30
  const summaryX = REKAP_A4_W - 20 - 280
  rect(page, summaryX, y - 14, 280, 90, REKAP_YELLOW)
  drawText(page, `TOTAL PENDAFTARAN : ${rp(totals.totalPendaftaran)}`, summaryX + 14, y, regular, 10)
  drawText(page, `TOTAL SEWA TENDA : ${rp(totals.totalSewaTenda)}`, summaryX + 14, y + 22, regular, 10)
  drawText(page, `TOTAL : ${rp(totals.totalKeseluruhan)}`, summaryX + 14, y + 44, bold, 12)
  let sigTop = y + 112
  const sigX = 50
  if (sigTop + 270 > 760) { page = createPage(); sigTop = 116 }
  drawSig(page, sigX, sigTop, 'PETUGAS / ADMIN', namaPetugas, regular, bold)
  drawSig(page, sigX, sigTop + 95, 'KOOR. KESEKRETARIATAN', null, regular, bold)
  drawSig(page, sigX, sigTop + 190, 'BENDAHARA', null, regular, bold)
  return Buffer.from(await pdf.save())
}
