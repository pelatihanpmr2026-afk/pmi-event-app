import { addMonoHeader, createRekapPdf, drawMonoSummary, drawMonoTable, MONO_BLACK, REKAP_A4_W, drawText, rp } from './pdf-rekap-text'

interface Row { keterangan: string; uraian: string; debit: number; kredit: number; utang: number }

export async function generatePdfRekapHarianKeuangan(
  tanggal: string,
  rows: Row[],
  totals: { totalDebit: number; totalKredit: number; totalUtang: number }
): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf(`Rekap Keuangan Harian ${tanggal}`)
  const createPage = () => addMonoHeader(pdf, 'REKAP KEUANGAN HARIAN', tanggal, bold, regular)
  let page = createPage()

  const widths = [30, 130, 170, 75, 75, 75]
  const tableResult = drawMonoTable({
    page,
    top: 100,
    x: 20,
    widths,
    aligns: ['center', 'left', 'left', 'right', 'right', 'right'],
    headers: ['NO', 'KETERANGAN', 'URAIAN', 'DEBIT', 'KREDIT', 'UTANG'],
    rows: rows.map((row, index) => [
      String(index + 1),
      row.keterangan,
      row.uraian,
      row.debit ? rp(row.debit) : '-',
      row.kredit ? rp(row.kredit) : '-',
      row.utang ? rp(row.utang) : '-',
    ]),
    fonts: { regular, bold },
    totalRow: ['', '', 'TOTAL', rp(totals.totalDebit), rp(totals.totalKredit), rp(totals.totalUtang)],
    createPage,
    continuationTitle: 'REKAP KEUANGAN HARIAN - LANJUTAN',
  })
  page = tableResult.page
  let tableEnd = tableResult.top

  tableEnd += 28
  if (tableEnd + 140 > 760) {
    page = createPage()
    tableEnd = 100
  }
  drawText(page, 'RINGKASAN', REKAP_A4_W - 20 - 270, tableEnd, bold, 10, MONO_BLACK, 'left')
  drawMonoSummary(
    page,
    REKAP_A4_W - 20 - 270,
    tableEnd + 8,
    270,
    [
      { label: 'Total Debit', value: rp(totals.totalDebit) },
      { label: 'Total Kredit', value: rp(totals.totalKredit) },
      { label: 'Total Utang', value: rp(totals.totalUtang), bold: true },
    ],
    { regular, bold }
  )
  return Buffer.from(await pdf.save())
}
