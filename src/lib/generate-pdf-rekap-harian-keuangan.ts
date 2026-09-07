import { addRekapPage, createRekapPdf, drawPaginatedTable, drawText, rect, REKAP_A4_W, REKAP_YELLOW, rp } from './pdf-rekap-text'

interface Row { keterangan: string; uraian: string; debit: number; kredit: number; utang: number }

export async function generatePdfRekapHarianKeuangan(
  tanggal: string,
  rows: Row[],
  totals: { totalDebit: number; totalKredit: number; totalUtang: number }
): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf(`Rekap Keuangan Harian ${tanggal}`)
  const createPage = () => addRekapPage(pdf, 'REKAP KEUANGAN HARIAN', tanggal, bold, regular)
  let page = createPage()
  let { top: tableEnd } = drawPaginatedTable({
    page, top: 116, x: 20, widths: [30, 130, 170, 75, 75, 75],
    headers: ['NO', 'KETERANGAN', 'URAIAN', 'DEBIT', 'KREDIT', 'UTANG'],
    rows: rows.map((row, index) => [String(index + 1), row.keterangan, row.uraian, row.debit ? rp(row.debit) : '-', row.kredit ? rp(row.kredit) : '-', row.utang ? rp(row.utang) : '-']),
    fonts: { regular, bold }, rowHeight: 24, createPage, continuationTitle: 'REKAP KEUANGAN - LANJUTAN',
  })
  page = pdf.getPages()[pdf.getPageCount() - 1]
  if (tableEnd + 112 > 760) { page = createPage(); tableEnd = 116 }
  const boxX = REKAP_A4_W - 20 - 270
  const boxTop = tableEnd + 30
  rect(page, boxX, boxTop, 270, 82, REKAP_YELLOW)
  drawText(page, `Total Debit : ${rp(totals.totalDebit)}`, boxX + 14, boxTop + 18, regular, 10)
  drawText(page, `Total Kredit : ${rp(totals.totalKredit)}`, boxX + 14, boxTop + 42, regular, 10)
  drawText(page, `Total Utang : ${rp(totals.totalUtang)}`, boxX + 14, boxTop + 66, bold, 11)
  return Buffer.from(await pdf.save())
}
