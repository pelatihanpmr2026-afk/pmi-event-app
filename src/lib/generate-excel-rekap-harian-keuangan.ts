import ExcelJS from 'exceljs'

interface Row {
  keterangan: string
  uraian: string
  debit: number
  kredit: number
  utang: number
}

export async function generateExcelRekapHarianKeuangan(
  tanggal: string,
  rows: Row[],
  totals: { totalDebit: number; totalKredit: number; totalUtang: number }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Rekap Harian')

  sheet.mergeCells('A1:F1')
  sheet.getCell('A1').value = `REKAP KEUANGAN HARIAN — ${tanggal}`
  sheet.getCell('A1').font = { bold: true, size: 14 }

  sheet.columns = [
    { key: 'no', width: 5 },
    { key: 'keterangan', width: 40 },
    { key: 'uraian', width: 20 },
    { key: 'debit', width: 15 },
    { key: 'kredit', width: 15 },
    { key: 'utang', width: 15 },
  ]

  sheet.getRow(3).values = ['No', 'Keterangan', 'Uraian', 'Debit', 'Kredit', 'Utang']
  sheet.getRow(3).eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3653A5' } }
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  })

  rows.forEach((r, i) => {
    sheet.getRow(i + 4).values = [i + 1, r.keterangan, r.uraian, r.debit, r.kredit, r.utang]
  })

  const totalRow = rows.length + 4
  sheet.getRow(totalRow).values = ['', '', 'TOTAL', totals.totalDebit, totals.totalKredit, totals.totalUtang]
  sheet.getRow(totalRow).font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}