import ExcelJS from 'exceljs'
import { saveBuffer } from './save-file'
import { cropToPassportPhoto } from './passport-photo'

interface PesertaExcelRow {
  namaLengkap: string
  tempatLahir: string
  tanggalLahir: Date
  alamat: string
  agama: string
  golonganDarah: string
  tahunMasuk: number
  noHp?: string | null
  gender: string
  fotoBuffer?: Buffer
}

interface PendampingExcelRow {
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

function buildColumns(includeFoto: boolean) {
  const base = [
    { header: 'No', key: 'no', width: 5 },
    ...(includeFoto ? [{ header: 'Foto', key: 'foto', width: 14 }] : []),
    { header: 'Nama Lengkap', key: 'nama', width: 28 },
    { header: 'Tempat Lahir', key: 'tempatLahir', width: 18 },
    { header: 'Tanggal Lahir', key: 'tanggalLahir', width: 15 },
    { header: 'Alamat', key: 'alamat', width: 32 },
    { header: 'Agama', key: 'agama', width: 12 },
    { header: 'Golongan Darah', key: 'golDarah', width: 14 },
    { header: 'Tahun Masuk', key: 'tahunMasuk', width: 12 },
    { header: 'No. HP', key: 'noHp', width: 16 },
    { header: 'Jenis Kelamin', key: 'gender', width: 14 },
  ]
  return base
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

export async function generateExcelSekolah({
  namaSekolah,
  kodePendaftaran,
  peserta,
  pendamping,
  filename,
}: {
  namaSekolah: string
  kodePendaftaran: string
  peserta: PesertaExcelRow[]
  pendamping: PendampingExcelRow[]
  filename: string
}): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sistem Pendaftaran PMR 2026'
  workbook.created = new Date()

  // ===== SHEET PESERTA =====
  const sheetPeserta = workbook.addWorksheet('Peserta')
  sheetPeserta.columns = buildColumns(true)
  styleHeaderRow(sheetPeserta, HEADER_STYLE_PESERTA)

  sheetPeserta.insertRow(1, [])
  sheetPeserta.mergeCells('A1:K1')
  sheetPeserta.getCell('A1').value = `${namaSekolah} — ${kodePendaftaran}`
  sheetPeserta.getCell('A1').font = { bold: true, size: 12 }
  sheetPeserta.getRow(2).values = buildColumns(true).map((c) => c.header)
  styleHeaderRow2(sheetPeserta)

for (let i = 0; i < peserta.length; i++) {
  const p = peserta[i]
  const rowNumber = i + 3
  sheetPeserta.getRow(rowNumber).values = [
    i + 1,
    '',
    p.namaLengkap,
    p.tempatLahir,
    p.tanggalLahir.toLocaleDateString('id-ID'),
    p.alamat,
    p.agama,
    p.golonganDarah,
    p.tahunMasuk,
    p.noHp || '-',
    p.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
  ]
  // Tinggi baris disesuaikan supaya foto 3cm muat (dalam satuan point Excel: 1cm ≈ 28.35pt)
  sheetPeserta.getRow(rowNumber).height = 88

  if (p.fotoBuffer) {
    const croppedBuffer = await cropToPassportPhoto(p.fotoBuffer)
    const imageId = workbook.addImage({ buffer: croppedBuffer as unknown as ExcelJS.Buffer, extension: 'jpeg' })
    sheetPeserta.addImage(imageId, {
      tl: { col: 1, row: rowNumber - 1 },
      // 2cm x 3cm pada 96 DPI (satuan px yang dipakai ExcelJS untuk sizing gambar)
      ext: { width: 76, height: 113 },
    })
  }
}

  // ===== SHEET PENDAMPING =====
  const sheetPendamping = workbook.addWorksheet('Pendamping')
  sheetPendamping.getCell('A1').value = `${namaSekolah} — ${kodePendaftaran}`
  sheetPendamping.mergeCells('A1:J1')
  sheetPendamping.getCell('A1').font = { bold: true, size: 12 }
  sheetPendamping.columns = buildColumns(false)
  sheetPendamping.getRow(2).values = buildColumns(false).map((c) => c.header)
  styleHeaderRow2(sheetPendamping, HEADER_STYLE_PENDAMPING)

  pendamping.forEach((p, i) => {
    sheetPendamping.getRow(i + 3).values = [
      i + 1,
      p.namaLengkap,
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
  return saveBuffer(Buffer.from(buffer), 'excel', filename)
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