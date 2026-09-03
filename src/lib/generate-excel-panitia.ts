import ExcelJS from 'exceljs'
import { ASAL_UNIT_OPTIONS, DIVISI_OPTIONS } from './constants'
import { tryCropToPassportPhoto } from './passport-photo'

interface PanitiaExcelRow {
  nomorRegistrasi: string
  nama: string
  gender: string
  noWhatsapp: string
  alamat: string
  asalUnit: string
  divisi: string
  status: string
  fotoBuffer?: Buffer | null
}

const PHOTO_WIDTH_PX = 60
const PHOTO_HEIGHT_PX = 80
const PHOTO_ROW_HEIGHT_PT = 90

function findLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

function safeSheetName(name: string, usedNames: Set<string>) {
  const base = name.replace(/[\\/?*:[\]]/g, '').slice(0, 31) || 'Divisi'
  let candidate = base
  let suffix = 2
  while (usedNames.has(candidate)) {
    const suffixText = ` ${suffix}`
    candidate = `${base.slice(0, 31 - suffixText.length)}${suffixText}`
    suffix += 1
  }
  usedNames.add(candidate)
  return candidate
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1)
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3653A5' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })
  header.height = 24
}

export async function generateExcelPanitiaPerDivisiBuffer(rows: PanitiaExcelRow[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistem Pendaftaran PMR 2026'
  workbook.created = new Date()

  const groups = new Map<string, PanitiaExcelRow[]>()
  for (const row of rows) {
    const group = groups.get(row.divisi) ?? []
    group.push(row)
    groups.set(row.divisi, group)
  }

  const orderedGroups = [...groups.entries()].sort((a, b) => {
    const orderA = DIVISI_OPTIONS.findIndex((option) => option.value === a[0])
    const orderB = DIVISI_OPTIONS.findIndex((option) => option.value === b[0])
    return orderA - orderB
  })
  const usedSheetNames = new Set<string>()

  for (const [divisi, divisionRows] of orderedGroups) {
    const sheet = workbook.addWorksheet(safeSheetName(findLabel(DIVISI_OPTIONS, divisi), usedSheetNames))
    sheet.columns = [
      { header: 'No. Registrasi', key: 'nomorRegistrasi', width: 28 },
      { header: 'Foto', key: 'foto', width: 12 },
      { header: 'Nama', key: 'nama', width: 28 },
      { header: 'Gender', key: 'gender', width: 14 },
      { header: 'WhatsApp', key: 'whatsapp', width: 18 },
      { header: 'Alamat', key: 'alamat', width: 42 },
      { header: 'Asal Unit', key: 'asalUnit', width: 22 },
      { header: 'Divisi', key: 'divisi', width: 28 },
      { header: 'Status', key: 'status', width: 14 },
    ]
    styleHeader(sheet)
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.autoFilter = 'A1:I1'

    divisionRows.forEach((row, index) => {
      const rowNumber = index + 2
      const excelRow = sheet.getRow(rowNumber)
      excelRow.values = [
        row.nomorRegistrasi,
        '',
        row.nama,
        row.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
        row.noWhatsapp,
        row.alamat,
        findLabel(ASAL_UNIT_OPTIONS, row.asalUnit),
        findLabel(DIVISI_OPTIONS, row.divisi),
        row.status,
      ]
      excelRow.alignment = { vertical: 'top', wrapText: true }

      if (row.fotoBuffer) {
        excelRow.height = PHOTO_ROW_HEIGHT_PT
        const photoBuffer = await tryCropToPassportPhoto(row.fotoBuffer)
        if (photoBuffer) {
          const imageId = workbook.addImage({
            buffer: photoBuffer as unknown as ExcelJS.Buffer,
            extension: 'jpeg',
          })
          sheet.addImage(imageId, {
            tl: { col: 1, row: rowNumber - 1 },
            ext: { width: PHOTO_WIDTH_PX, height: PHOTO_HEIGHT_PX },
          })
        }
      }
    })
  }

  if (orderedGroups.length === 0) {
    const sheet = workbook.addWorksheet('Tidak Ada Data')
    sheet.getCell('A1').value = 'Tidak ada data panitia untuk diekspor.'
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
