import { addMonoHeader, createRekapPdf, drawMonoSig, drawMonoSummary, drawMonoTable, MONO_BLACK, REKAP_A4_W, drawText, rp } from './pdf-rekap-text'
import type { PDFFont } from 'pdf-lib'

interface PendaftaranRow { namaSekolah: string; jumlahPeserta: number; jumlahPendamping: number; totalRp: number }
interface TendaRincianRow { namaSekolah: string; jumlahTenda: number; jenisTenda: string; totalRp: number }

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function bungkusTeks(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function generatePdfRekapPendaftaran(
  tanggal: string,
  pendaftaran: PendaftaranRow[],
  tendaRincian: TendaRincianRow[],
  totals: { totalJumlahPeserta: number; totalJumlahPendamping: number; totalJumlahTenda: number; totalPendaftaran: number; totalSewaTenda: number; totalKeseluruhan: number },
  namaPetugas: string,
  totalCash: number,
  totalTransfer: number
): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf(`Laporan Pemasukkan Harian ${tanggal}`)
  const createPage = () => addMonoHeader(pdf, 'BERITA ACARA LAPORAN PEMASUKKAN HARIAN', tanggal, bold, regular)
  let page = createPage()

  let y = 100
  drawText(page, 'A.  PENDAPATAN PENDAFTARAN', 20, y, bold, 11, MONO_BLACK, 'left')
  y += 15
  const pendaftaranTable = drawMonoTable({
    page,
    top: y,
    x: 20,
    widths: [30, 190, 105, 115, 115],
    aligns: ['center', 'left', 'center', 'center', 'right'],
    headers: ['NO', 'NAMA SEKOLAH', 'JML. PESERTA', 'JML. PENDAMPING', 'TOTAL (RP)'],
    rows: pendaftaran.map((row, index) => [String(index + 1), row.namaSekolah, String(row.jumlahPeserta), String(row.jumlahPendamping), rp(row.totalRp)]),
    fonts: { regular, bold },
    totalRow: ['', 'TOTAL', String(totals.totalJumlahPeserta), String(totals.totalJumlahPendamping), rp(totals.totalPendaftaran)],
    createPage,
    continuationTitle: 'LAPORAN PENDAFTARAN - LANJUTAN',
  })
  page = pendaftaranTable.page
  y = pendaftaranTable.top + 30
  if (y + 150 > 760) {
    page = createPage()
    y = 100
  }
  drawText(page, 'B.  PENDAPATAN SEWA TENDA', 20, y, bold, 11, MONO_BLACK, 'left')
  y += 15
  // Satu baris per jenis tenda; baris lanjutan sekolah yang sama
  // dikosongkan nomor dan nama sekolahnya.
  let nomorTenda = 0
  let sekolahTerakhir = ''
  const barisTenda = tendaRincian.map((row) => {
    const barisBaru = row.namaSekolah !== sekolahTerakhir
    sekolahTerakhir = row.namaSekolah
    if (barisBaru) nomorTenda++
    return [
      barisBaru ? String(nomorTenda) : '',
      barisBaru ? row.namaSekolah : '',
      String(row.jumlahTenda),
      row.jenisTenda,
      rp(row.totalRp),
    ]
  })
  ;({ page, top: y } = drawMonoTable({
    page,
    top: y,
    x: 20,
    widths: [30, 120, 75, 200, 130],
    aligns: ['center', 'left', 'center', 'left', 'right'],
    headers: ['NO', 'NAMA SEKOLAH', 'JML. TENDA', 'JENIS TENDA', 'TOTAL (RP)'],
    rows: barisTenda,
    fonts: { regular, bold },
    totalRow: ['', 'TOTAL', String(totals.totalJumlahTenda), '', rp(totals.totalSewaTenda)],
    createPage,
    continuationTitle: 'LAPORAN SEWA TENDA - LANJUTAN',
  }))

  y += 30
  if (y + 290 > 760) {
    page = createPage()
    y = 100
  }
  drawText(page, 'RINGKASAN', REKAP_A4_W - 20 - 320, y, bold, 10, MONO_BLACK, 'left')
  y = drawMonoSummary(
    page,
    REKAP_A4_W - 20 - 320,
    y + 12,
    320,
    [
      { label: 'Total Peserta', value: String(totals.totalJumlahPeserta) },
      { label: 'Total Pendamping', value: String(totals.totalJumlahPendamping) },
      { label: 'Total Biaya Pendaftaran', value: rp(totals.totalPendaftaran) },
      { label: 'Total Biaya Sewa Tenda', value: rp(totals.totalSewaTenda) },
      { label: 'Total Setoran Cash', value: rp(totalCash) },
      { label: 'Total Setoran Transfer', value: rp(totalTransfer) },
      { label: 'Total Pemasukkan Hari Ini', value: rp(totals.totalKeseluruhan), bold: true },
    ],
    { regular, bold }
  )

  const sekarang = new Date()
  const pernyataan =
    `Yang bertanda tangan di bawah ini menyatakan bahwa laporan keuangan ${NAMA_HARI[sekarang.getDay()]}, ` +
    `${sekarang.getDate()} ${NAMA_BULAN[sekarang.getMonth()]} ${sekarang.getFullYear()} ini dibuat dengan sebenar-benarnya.`
  const barisPernyataan = bungkusTeks(regular, pernyataan, 10, REKAP_A4_W - 40)

  if (y + 24 + barisPernyataan.length * 18 + 320 > 760) {
    page = createPage()
    y = 100
  }
  y += 24
  for (const baris of barisPernyataan) {
    drawText(page, baris, 20, y, regular, 10, MONO_BLACK, 'left')
    y += 18
  }

  y += 22
  drawText(page, 'Mengetahui,', REKAP_A4_W / 2, y, bold, 10, MONO_BLACK, 'center')
  const tingkatSatuTop = y + 26
  drawMonoSig(page, 110, tingkatSatuTop, 'Petugas / Admin', namaPetugas, regular, bold)
  drawMonoSig(page, REKAP_A4_W - 110, tingkatSatuTop, 'Koordinator Kesekretariatan', null, regular, bold)

  const menyetujuiTop = tingkatSatuTop + 108
  drawText(page, 'Menyetujui,', REKAP_A4_W / 2, menyetujuiTop, bold, 10, MONO_BLACK, 'center')
  drawMonoSig(page, REKAP_A4_W / 2, menyetujuiTop + 26, 'Bendahara', null, regular, bold)
  return Buffer.from(await pdf.save())
}
