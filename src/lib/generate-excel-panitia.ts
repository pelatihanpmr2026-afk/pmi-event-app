import ExcelJS from 'exceljs'
import { ASAL_UNIT_OPTIONS, DIVISI_OPTIONS } from './constants'
import { ringkasNamaPanitia } from './utils'
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

    for (const [index, row] of divisionRows.entries()) {
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
    }
  }

  if (orderedGroups.length === 0) {
    const sheet = workbook.addWorksheet('Tidak Ada Data')
    sheet.getCell('A1').value = 'Tidak ada data panitia untuk diekspor.'
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export interface PanitiaLengkapExcelRow {
  nomorRegistrasi: string
  nama: string
  gender: string
  noWhatsapp: string
  alamat: string
  asalUnit: string
  divisi: string
  hadirSesiIds: string[]
  status: string
}

export interface PanitiaLengkapExcelSesi {
  id: string
  nama: string
}

/** Export datar sesuai tabel dashboard: satu sheet, kolom kehadiran per sesi. */
export async function generateExcelPanitiaLengkapBuffer(
  rows: PanitiaLengkapExcelRow[],
  sesiList: PanitiaLengkapExcelSesi[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistem Pendaftaran PMR 2026'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Data Panitia')
  sheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'No. Registrasi', key: 'nomorRegistrasi', width: 24 },
    { header: 'Nama', key: 'nama', width: 28 },
    { header: 'Gender', key: 'gender', width: 14 },
    { header: 'WhatsApp', key: 'whatsapp', width: 18 },
    { header: 'Alamat', key: 'alamat', width: 42 },
    { header: 'Asal Unit', key: 'asalUnit', width: 22 },
    { header: 'Divisi', key: 'divisi', width: 28 },
    ...sesiList.map((sesi) => ({ header: sesi.nama, key: `sesi_${sesi.id}`, width: 16 })),
    { header: 'Status', key: 'status', width: 14 },
  ]
  styleHeader(sheet)
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  const toColLetter = (n: number): string => {
    let s = ''
    while (n > 0) {
      const m = (n - 1) % 26
      s = String.fromCharCode(65 + m) + s
      n = Math.floor((n - 1) / 26)
    }
    return s
  }
  sheet.autoFilter = `A1:${toColLetter(sheet.columnCount)}1`

  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(index + 2)
    excelRow.values = [
      index + 1,
      row.nomorRegistrasi,
      ringkasNamaPanitia(row.nama),
      row.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
      row.noWhatsapp,
      row.alamat,
      findLabel(ASAL_UNIT_OPTIONS, row.asalUnit),
      findLabel(DIVISI_OPTIONS, row.divisi),
      ...sesiList.map((sesi) => (row.hadirSesiIds.includes(sesi.id) ? 'Hadir' : '-')),
      row.status,
    ]
    excelRow.alignment = { vertical: 'top', wrapText: true }
    excelRow.font = { size: 11 }
  })

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
