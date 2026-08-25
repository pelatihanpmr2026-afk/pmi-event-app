import ExcelJS from 'exceljs'
import { RIWAYAT_PENYAKIT_OPTIONS } from './constants-sekolah'
import { tryCropToPassportPhoto } from './passport-photo'

interface PesertaExcelRow {
  noPeserta?: string | null
  namaLengkap: string
  tempatLahir: string
  tanggalLahir: Date
  alamat: string
  agama: string
  golonganDarah: string
  tahunMasuk: number
  noHp?: string | null
  gender: string
  riwayatPenyakit?: string | null
  fotoBuffer?: Buffer
}

interface PendampingExcelRow {
  noPeserta?: string | null
  namaLengkap: string
  tempatLahir: string
  tanggalLahir: Date
  alamat: string
  agama: string
  golonganDarah: string
  tahunMasuk: number
  noHp?: string | null
  gender: string
}

const HEADER_STYLE_PESERTA = 'FF3653A5' // event-navy
const HEADER_STYLE_PENDAMPING = 'FFEC3E96' // event-pink
const PHOTO_COLUMN_WIDTH = 12
const PHOTO_WIDTH_PX = 76 // 2 cm at 96 DPI
const PHOTO_HEIGHT_PX = 113 // 3 cm at 96 DPI
const PHOTO_ROW_HEIGHT_PT = 120

function findRiwayatLabel(value: string | null | undefined) {
  if (!value) return '-'
  return RIWAYAT_PENYAKIT_OPTIONS.find((o) => o.value === value)?.label ?? value
}

function buildColumns(tipe: 'PESERTA' | 'PENDAMPING') {
  const includeFoto = tipe === 'PESERTA'
  const includeRiwayat = tipe === 'PESERTA'
  return [
    { header: `No ${tipe === 'PESERTA' ? 'Peserta' : 'Pendamping'}`, key: 'no', width: 12 },
    ...(includeFoto ? [{ header: 'Foto', key: 'foto', width: PHOTO_COLUMN_WIDTH }] : []),
    { header: 'Nama Lengkap', key: 'nama', width: 26 },
    { header: 'Sekolah', key: 'sekolah', width: 28 },
    { header: 'Tempat Lahir', key: 'tempatLahir', width: 16 },
    { header: 'Tanggal Lahir', key: 'tanggalLahir', width: 14 },
    { header: 'Alamat', key: 'alamat', width: 30 },
    { header: 'Agama', key: 'agama', width: 12 },
    { header: 'Gol. Darah', key: 'golDarah', width: 10 },
    { header: 'Tahun Masuk', key: 'tahunMasuk', width: 12 },
    { header: 'No. HP', key: 'noHp', width: 16 },
    { header: 'Gender', key: 'gender', width: 12 },
    ...(includeRiwayat ? [{ header: 'Riwayat Penyakit', key: 'riwayat', width: 22 }] : []),
  ]
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, color: string) {
  const row = sheet.getRow(1)
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  row.height = 22
}

export async function generateExcelSekolahBuffer({
  namaSekolah,
  kodePendaftaran,
  peserta,
  pendamping,
}: {
  namaSekolah: string
  kodePendaftaran: string
  peserta: PesertaExcelRow[]
  pendamping: PendampingExcelRow[]
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistem Pendaftaran PMR 2026'
  workbook.created = new Date()

  // ===== SHEET PESERTA =====
  const sheetPeserta = workbook.addWorksheet('Peserta')
  const pesertaColumns = buildColumns('PESERTA')
  sheetPeserta.columns = pesertaColumns
  styleHeaderRow(sheetPeserta, HEADER_STYLE_PESERTA)

  sheetPeserta.insertRow(1, [])
  sheetPeserta.mergeCells(`A1:${columnLetter(pesertaColumns.length)}1`)
  sheetPeserta.getCell('A1').value = `${namaSekolah} — ${kodePendaftaran}`
  sheetPeserta.getCell('A1').font = { bold: true, size: 12 }
  sheetPeserta.getRow(2).values = pesertaColumns.map((c) => c.header)
  styleHeaderRow2(sheetPeserta)

  for (let i = 0; i < peserta.length; i++) {
    const p = peserta[i]
    const rowNumber = i + 3
    sheetPeserta.getRow(rowNumber).values = [
      p.noPeserta ?? '-',
      '',
      p.namaLengkap,
      namaSekolah,
      p.tempatLahir,
      p.tanggalLahir.toLocaleDateString('id-ID'),
      p.alamat,
      p.agama,
      p.golonganDarah,
      p.tahunMasuk,
      p.noHp || '-',
      p.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
      findRiwayatLabel(p.riwayatPenyakit),
    ]
    // Tinggi baris disesuaikan supaya foto 3cm muat (dalam satuan point Excel: 1cm ≈ 28.35pt)
    // Kolom dan tinggi baris dibuat tetap agar setiap foto 2 x 3 cm selalu muat.
    sheetPeserta.getRow(rowNumber).height = PHOTO_ROW_HEIGHT_PT

    if (p.fotoBuffer) {
      const croppedBuffer = await tryCropToPassportPhoto(p.fotoBuffer)
      if (croppedBuffer) {
        const imageId = workbook.addImage({ buffer: croppedBuffer as unknown as ExcelJS.Buffer, extension: 'jpeg' })
        sheetPeserta.addImage(imageId, {
          tl: { col: 1, row: rowNumber - 1 },
          ext: { width: PHOTO_WIDTH_PX, height: PHOTO_HEIGHT_PX },
        })
      }
    }
  }

  // ===== SHEET PENDAMPING =====
  const sheetPendamping = workbook.addWorksheet('Pendamping')
  // Set columns FIRST (this writes header labels into row 1), THEN insert a
  // blank row for the title and merge it. Merging A1:J1 before assigning
  // `.columns` made ExcelJS try to write header text into merged non-master
  // cells (B1..J1), which throws and breaks the whole export.
  const pendampingColumns = buildColumns('PENDAMPING')
  sheetPendamping.columns = pendampingColumns
  sheetPendamping.insertRow(1, [])
  sheetPendamping.mergeCells(`A1:${columnLetter(pendampingColumns.length)}1`)
  sheetPendamping.getCell('A1').value = `${namaSekolah} — ${kodePendaftaran}`
  sheetPendamping.getCell('A1').font = { bold: true, size: 12 }
  sheetPendamping.getRow(2).values = pendampingColumns.map((c) => c.header)
  styleHeaderRow2(sheetPendamping, HEADER_STYLE_PENDAMPING)

  pendamping.forEach((p, i) => {
    sheetPendamping.getRow(i + 3).values = [
      p.noPeserta ?? '-',
      p.namaLengkap,
      namaSekolah,
      p.tempatLahir,
      p.tanggalLahir.toLocaleDateString('id-ID'),
      p.alamat,
      p.agama,
      p.golonganDarah,
      p.tahunMasuk,
      p.noHp || '-',
      p.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
    ]
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

function columnLetter(index: number): string {
  let n = index
  let result = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

function styleHeaderRow2(sheet: ExcelJS.Worksheet, color: string = HEADER_STYLE_PESERTA) {
  const row = sheet.getRow(2)
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  row.height = 22
}

export type { PesertaExcelRow, PendampingExcelRow }