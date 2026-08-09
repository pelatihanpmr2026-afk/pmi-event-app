import ExcelJS from 'exceljs'
import { RIWAYAT_PENYAKIT_OPTIONS } from './constants-sekolah'

interface RekapRow {
  noPeserta: string
  namaLengkap: string
  sekolahNama: string
  tempatLahir: string
  tanggalLahir: Date
  alamat : string
  agama: string
  golonganDarah: string
  tahunMasuk: number
  noHp: string | null
  gender: string
  riwayatPenyakit?: string | null
  fotoBuffer?: Buffer | null
}

function findRiwayatLabel(value: string | null | undefined) {
  if (!value) return '-'
  return RIWAYAT_PENYAKIT_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export async function generateExcelPesertaRekapBuffer(
  rows: RekapRow[],
  tipe: 'PESERTA' | 'PENDAMPING',
  withPhoto: boolean
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(tipe === 'PESERTA' ? 'Data Peserta' : 'Data Pendamping')

  const includeFoto = tipe === 'PESERTA' && withPhoto
  const includeRiwayat = tipe === 'PESERTA'

  const columns = [
    { header: `No ${tipe === 'PESERTA' ? 'Peserta' : 'Pendamping'}`, key: 'no', width: 12 },
    ...(includeFoto ? [{ header: 'Foto', key: 'foto', width: 14 }] : []),
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

  sheet.columns = columns
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3653A5' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  })

  rows.forEach((r, i) => {
    const rowNum = i + 2

    const values: (string | number)[] = [r.noPeserta]
    if (includeFoto) values.push('')
    values.push(
      r.namaLengkap,
      r.sekolahNama,
      r.tempatLahir,
      r.tanggalLahir.toLocaleDateString('id-ID'),
      r.alamat,
      r.agama,
      r.golonganDarah,
      r.tahunMasuk,
      r.noHp || '-',
      r.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'
    )
    if (includeRiwayat) values.push(findRiwayatLabel(r.riwayatPenyakit))

    sheet.getRow(rowNum).values = values

    if (includeFoto) {
      sheet.getRow(rowNum).height = 60
      if (r.fotoBuffer) {
        const imageId = workbook.addImage({ buffer: r.fotoBuffer as unknown as ExcelJS.Buffer, extension: 'jpeg' })
        sheet.addImage(imageId, { tl: { col: 1, row: rowNum - 1 }, ext: { width: 65, height: 65 } })
      }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}