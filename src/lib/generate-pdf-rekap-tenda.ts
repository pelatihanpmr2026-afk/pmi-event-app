import { addMonoHeader, createRekapPdf, drawMonoSig, drawMonoTable, REKAP_A4_W } from './pdf-rekap-text'

interface TendaRow {
  no: number
  namaSekolah: string
  tenda: { nama: string; jumlah: number }[]
  totalUnit: number
}

export async function generatePdfRekapTenda(tanggal: string, rows: TendaRow[]): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf(`Rekap Sewa Tenda ${tanggal}`)
  const createPage = () => addMonoHeader(pdf, 'REKAP HARIAN SEWA TENDA', tanggal, bold, regular)
  let page = createPage()

  const totalUnit = rows.reduce((sum, row) => sum + row.totalUnit, 0)
  const tableRows = rows.map((row) => [
    String(row.no),
    row.namaSekolah,
    row.tenda.map((tenda) => `${tenda.nama} x ${tenda.jumlah}`).join(', '),
    String(row.totalUnit),
  ])
  const tableResult = drawMonoTable({
    page,
    top: 100,
    x: 20,
    widths: [30, 200, 245, 80],
    aligns: ['center', 'left', 'left', 'center'],
    headers: ['NO', 'NAMA SEKOLAH', 'JENIS TENDA YANG DISEWA', 'JUMLAH'],
    rows: tableRows,
    fonts: { regular, bold },
    totalRow: ['', 'TOTAL', '', `${totalUnit} unit`],
    createPage,
    continuationTitle: 'REKAP HARIAN SEWA TENDA - LANJUTAN',
  })
  page = tableResult.page
  let tableEnd = tableResult.top

  tableEnd += 40
  if (tableEnd + 110 > 760) {
    page = createPage()
    tableEnd = 100
  }
  drawMonoSig(page, REKAP_A4_W - 110, tableEnd, 'Mengetahui, Koordinator Kesekretariatan', null, regular, bold)
  return Buffer.from(await pdf.save())
}
