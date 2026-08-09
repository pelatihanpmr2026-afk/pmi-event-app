import ExcelJS from 'exceljs'

interface PendaftaranRow { namaSekolah: string; jumlahPeserta: number; jumlahPendamping: number; totalRp: number }
interface TendaRow { namaSekolah: string; namaTenda: string; jumlahTenda: number; totalRp: number }

export async function generateExcelRekapPendaftaran(
  tanggal: string,
  pendaftaran: PendaftaranRow[],
  tenda: TendaRow[],
  totals: {
    totalJumlahPeserta: number
    totalJumlahPendamping: number
    totalJumlahTenda: number
    totalPendaftaran: number
    totalSewaTenda: number
    totalKeseluruhan: number
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Rekap Pendaftaran')

  sheet.mergeCells('A1:E1')
  sheet.getCell('A1').value = `REKAP PENDAFTARAN HARIAN — ${tanggal}`
  sheet.getCell('A1').font = { bold: true, size: 14 }

  sheet.columns = [
    { key: 'no', width: 5 },
    { key: 'nama', width: 32 },
    { key: 'c3', width: 18 },
    { key: 'c4', width: 18 },
    { key: 'c5', width: 18 },
  ]

  sheet.getRow(3).values = ['No', 'Nama Sekolah', 'Jumlah Peserta', 'Jumlah Pendamping', 'Total (Rp)']
  sheet.getRow(3).eachCell((c) => {
    c.font = { bold: true }
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  })

  pendaftaran.forEach((r, i) => {
    sheet.getRow(i + 4).values = [i + 1, r.namaSekolah, r.jumlahPeserta, r.jumlahPendamping, r.totalRp]
  })

  const totalRow1 = pendaftaran.length + 4
  sheet.getRow(totalRow1).values = ['', 'TOTAL', totals.totalJumlahPeserta, totals.totalJumlahPendamping, totals.totalPendaftaran]
  sheet.getRow(totalRow1).font = { bold: true }

  let nextRow = totalRow1 + 3

  sheet.mergeCells(`A${nextRow}:E${nextRow}`)
  sheet.getCell(`A${nextRow}`).value = `REKAP PENDAFTARAN HARIAN — ${tanggal}`
  sheet.getCell(`A${nextRow}`).font = { bold: true, size: 14 }
  nextRow += 2

  sheet.getRow(nextRow).values = ['No', 'Nama Sekolah', 'Nama Tenda', 'Jumlah Tenda', 'Total (Rp)']
  sheet.getRow(nextRow).eachCell((c) => {
    c.font = { bold: true }
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  })
  nextRow += 1

  tenda.forEach((r, i) => {
    sheet.getRow(nextRow + i).values = [i + 1, r.namaSekolah, r.namaTenda, r.jumlahTenda, r.totalRp]
  })
  nextRow += tenda.length

  sheet.getRow(nextRow).values = ['', '', 'TOTAL', totals.totalJumlahTenda, totals.totalSewaTenda]
  sheet.getRow(nextRow).font = { bold: true }
  nextRow += 3

  sheet.getCell(`D${nextRow}`).value = 'TOTAL PENDAFTARAN :'
  sheet.getCell(`E${nextRow}`).value = totals.totalPendaftaran
  nextRow += 1
  sheet.getCell(`D${nextRow}`).value = 'TOTAL SEWA TENDA :'
  sheet.getCell(`E${nextRow}`).value = totals.totalSewaTenda
  nextRow += 1
  sheet.getCell(`D${nextRow}`).value = 'TOTAL :'
  sheet.getCell(`E${nextRow}`).value = totals.totalKeseluruhan
  sheet.getRow(nextRow).font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}