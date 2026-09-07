import { addRekapPage, createRekapPdf, drawTableWithFonts, drawText, REKAP_A4_W, REKAP_MUTED } from './pdf-rekap-text'

interface TendaRow {
  no: number
  namaSekolah: string
  tenda: { nama: string; jumlah: number }[]
  totalUnit: number
}

export async function generatePdfRekapTenda(tanggal: string, rows: TendaRow[]): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf(`Rekap Sewa Tenda ${tanggal}`)
  const page = addRekapPage(pdf, 'REKAP HARIAN SEWA TENDA', tanggal, bold, regular)
  const tableRows = rows.map((row) => [String(row.no), row.namaSekolah, row.tenda.map((tenda) => `${tenda.nama} x ${tenda.jumlah}`).join(', '), String(row.totalUnit)])
  const tableEnd = drawTableWithFonts(page, 20, 116, [30, 200, 245, 80], ['NO', 'NAMA SEKOLAH', 'JENIS TENDA YANG DISEWA', 'QTY'], tableRows, { regular, bold }, undefined, 26)
  const signatureTop = Math.min(tableEnd + 42, 720)
  drawText(page, 'Mengetahui,', REKAP_A4_W - 110, signatureTop, regular, 10, undefined, 'center')
  drawText(page, '_______________________', REKAP_A4_W - 110, signatureTop + 55, regular, 10, REKAP_MUTED, 'center')
  drawText(page, 'Koordinator Kesekretariatan', REKAP_A4_W - 110, signatureTop + 80, bold, 10, undefined, 'center')
  return Buffer.from(await pdf.save())
}
