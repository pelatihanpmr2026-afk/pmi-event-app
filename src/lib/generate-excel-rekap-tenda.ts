import ExcelJS from 'exceljs'

interface TendaRow {
  no: number
  namaSekolah: string
  tenda: { nama: string; jumlah: number }[]
  totalUnit: number
}

export async function generateExcelRekapTenda(tanggal: string, rows: TendaRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Rekap Sewa Tenda')

  sheet.mergeCells('A1:D1')
  sheet.getCell('A1').value = `REKAP HARIAN SEWA TENDA — ${tanggal}`
  sheet.getCell('A1').font = { bold: true, size: 14 }

  sheet.columns = [
    { key: 'no', width: 6 },
    { key: 'nama', width: 54 },
    { key: 'tenda', width: 42 },
    { key: 'qty', width: 10 },
  ]

  sheet.getRow(3).values = ['No', 'Nama Sekolah', 'Jenis Tenda yang Disewa', 'Qty']
  sheet.getRow(3).eachCell((c) => {
    c.font = { bold: true }
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  })

  rows.forEach((r, i) => {
    const row = sheet.getRow(i + 4)
    const tendaText = r.tenda.map((t) => `${t.nama} x ${t.jumlah}`).join('\n')
    row.values = [r.no, r.namaSekolah, tendaText, r.totalUnit]
    row.getCell(2).alignment = { wrapText: true, vertical: 'middle' }
    row.getCell(3).alignment = { wrapText: true, vertical: 'middle' }
    row.getCell(4).alignment = { vertical: 'middle' }
    row.height = Math.max(20, Math.max(r.tenda.length, 2) * 15 + 6)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}