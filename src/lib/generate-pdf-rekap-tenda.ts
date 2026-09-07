import { addRekapPage, createRekapPdf, drawPaginatedTable, drawText, REKAP_A4_W, REKAP_MUTED } from './pdf-rekap-text'

interface TendaRow {
  no: number
  namaSekolah: string
  tenda: { nama: string; jumlah: number }[]
  totalUnit: number
}

export async function generatePdfRekapTenda(tanggal: string, rows: TendaRow[]): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf(`Rekap Sewa Tenda ${tanggal}`)
  const createPage = () => addRekapPage(pdf, 'REKAP HARIAN SEWA TENDA', tanggal, bold, regular)
  let page = createPage()
  const tableRows = rows.map((row) => [String(row.no), row.namaSekolah, row.tenda.map((tenda) => `${tenda.nama} x ${tenda.jumlah}`).join(', '), String(row.totalUnit)])
  let { top: tableEnd } = drawPaginatedTable({
    page, top: 116, x: 20, widths: [30, 200, 245, 80], headers: ['NO', 'NAMA SEKOLAH', 'JENIS TENDA YANG DISEWA', 'JMLH'],
    rows: tableRows, fonts: { regular, bold }, rowHeight: 26, createPage, continuationTitle: 'REKAP SEWA TENDA - LANJUTAN',
  })
  page = pdf.getPages()[pdf.getPageCount() - 1]
  if (tableEnd + 122 > 760) { page = createPage(); tableEnd = 116 }
  const signatureTop = tableEnd + 42
  drawText(page, 'Mengetahui,', REKAP_A4_W - 110, signatureTop, regular, 10, undefined, 'center')
  drawText(page, '_______________________', REKAP_A4_W - 110, signatureTop + 55, regular, 10, REKAP_MUTED, 'center')
  drawText(page, 'Koordinator Kesekretariatan', REKAP_A4_W - 110, signatureTop + 80, bold, 10, undefined, 'center')
  return Buffer.from(await pdf.save())
}
