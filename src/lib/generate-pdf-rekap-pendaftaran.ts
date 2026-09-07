import { addRekapPage, createRekapPdf, drawTableWithFonts, drawText, rect, REKAP_A4_W, REKAP_NAVY, REKAP_YELLOW, rp } from './pdf-rekap-text'

interface PendaftaranRow { namaSekolah: string; jumlahPeserta: number; jumlahPendamping: number; totalRp: number }
interface TendaRow { namaSekolah: string; namaTenda: string; jumlahTenda: number; totalRp: number }

export async function generatePdfRekapPendaftaran(
  tanggal: string,
  pendaftaran: PendaftaranRow[],
  tenda: TendaRow[],
  totals: { totalJumlahPeserta: number; totalJumlahPendamping: number; totalJumlahTenda: number; totalPendaftaran: number; totalSewaTenda: number; totalKeseluruhan: number }
): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf(`Rekap Pendaftaran ${tanggal}`)
  const page = addRekapPage(pdf, 'REKAP PENDAFTARAN HARIAN', tanggal, bold, regular)
  let y = drawTableWithFonts(
    page, 20, 116, [30, 190, 105, 115, 115],
    ['NO', 'NAMA SEKOLAH', 'JUMLAH PESERTA', 'JUMLAH PENDAMPING', 'TOTAL (RP.)'],
    pendaftaran.map((row, index) => [String(index + 1), row.namaSekolah, String(row.jumlahPeserta), String(row.jumlahPendamping), rp(row.totalRp)]),
    { regular, bold }, ['', 'TOTAL', String(totals.totalJumlahPeserta), String(totals.totalJumlahPendamping), rp(totals.totalPendaftaran)], 24
  )
  y += 40
  drawText(page, 'REKAP HARIAN SEWA TENDA', REKAP_A4_W / 2, y, bold, 13, REKAP_NAVY, 'center')
  y += 26
  y = drawTableWithFonts(
    page, 20, y, [30, 190, 135, 100, 100],
    ['NO', 'NAMA SEKOLAH', 'NAMA TENDA', 'JUMLAH TENDA', 'TOTAL (RP.)'],
    tenda.map((row, index) => [String(index + 1), row.namaSekolah, row.namaTenda, String(row.jumlahTenda), rp(row.totalRp)]),
    { regular, bold }, ['', '', 'TOTAL', String(totals.totalJumlahTenda), rp(totals.totalSewaTenda)], 24
  )
  y += 30
  const summaryX = REKAP_A4_W - 20 - 280
  rect(page, summaryX, y - 14, 280, 90, REKAP_YELLOW)
  drawText(page, `TOTAL PENDAFTARAN : ${rp(totals.totalPendaftaran)}`, summaryX + 14, y, regular, 10)
  drawText(page, `TOTAL SEWA TENDA : ${rp(totals.totalSewaTenda)}`, summaryX + 14, y + 22, regular, 10)
  drawText(page, `TOTAL : ${rp(totals.totalKeseluruhan)}`, summaryX + 14, y + 44, bold, 12)
  y += 112
  drawText(page, 'Mengetahui,', summaryX + 140, y, regular, 10, undefined, 'center')
  drawText(page, '_______________________', summaryX + 140, y + 55, regular, 10, undefined, 'center')
  drawText(page, 'Koordinator Kesekretariatan', summaryX + 140, y + 77, bold, 10, undefined, 'center')
  return Buffer.from(await pdf.save())
}
