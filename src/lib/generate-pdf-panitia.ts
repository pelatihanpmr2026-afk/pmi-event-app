import { addMonoHeader, createRekapPdf, drawMonoSig, drawMonoSummary, drawMonoTable, REKAP_A4_W } from './pdf-rekap-text'
import { ringkasNamaPanitia } from './utils'

export interface PanitiaPdfSesi {
  id: string
  nama: string
}

export interface PanitiaPdfRow {
  nomorRegistrasi: string
  nama: string
  asalUnit: string
  divisi: string
  hadirSesiIds: string[]
  status: string
}

function bagiLebar(jumlahSesi: number): { nama: number; unit: number; divisi: number; sesi: number } {
  const sisa = 555 - 24 - 56
  if (jumlahSesi <= 0) return { nama: 200, unit: 120, divisi: 155, sesi: 0 }
  const sesi = Math.max(40, Math.floor(140 / jumlahSesi))
  const untukSesi = sesi * jumlahSesi
  const sisaNama = sisa - untukSesi
  return { nama: 150, unit: 65, divisi: sisaNama - 215, sesi }
}

export async function generatePdfPanitia(
  tanggal: string,
  subjudul: string,
  sesiList: PanitiaPdfSesi[],
  rows: PanitiaPdfRow[],
  namaPetugas: string
): Promise<Buffer> {
  const { pdf, regular, bold } = await createRekapPdf('Data Panitia')
  const createPage = () => addMonoHeader(pdf, 'DATA PANITIA', `${tanggal}${subjudul ? ` · ${subjudul}` : ''}`, bold, regular)
  let page = createPage()

  const lebar = bagiLebar(sesiList.length)
  const widths = [24, lebar.nama, lebar.unit, lebar.divisi, ...sesiList.map(() => lebar.sesi), 56]
  const aligns = ['center', 'left', 'left', 'left', ...sesiList.map(() => 'center' as const), 'center'] as (
    | 'left'
    | 'center'
    | 'right'
  )[]

  const tableResult = drawMonoTable({
    page,
    top: 100,
    x: 20,
    widths,
    aligns,
    headers: ['NO', 'NAMA', 'UNIT', 'DIVISI', ...sesiList.map((s) => s.nama.toUpperCase()), 'STATUS'],
    rows: rows.map((row, index) => [
      String(index + 1),
      ringkasNamaPanitia(row.nama),
      row.asalUnit,
      row.divisi,
      ...sesiList.map((s) => (row.hadirSesiIds.includes(s.id) ? 'Hadir' : '-')),
      row.status,
    ]),
    fonts: { regular, bold },
    createPage,
    continuationTitle: 'DATA PANITIA - LANJUTAN',
  })
  page = tableResult.page
  let bawah = tableResult.top + 28
  if (bawah + 60 + sesiList.length * 20 + 130 > 760) {
    page = createPage()
    bawah = 100
  }

  const ringkasan = [
    { label: 'Total Panitia', value: String(rows.length) },
    ...sesiList.map((s) => ({
      label: `Hadir ${s.nama}`,
      value: String(rows.filter((r) => r.hadirSesiIds.includes(s.id)).length),
    })),
  ]
  bawah = drawMonoSummary(page, REKAP_A4_W - 20 - 270, bawah, 270, ringkasan, { regular, bold })

  drawMonoSig(page, REKAP_A4_W - 110, bawah + 40, 'Mengetahui, Ketua Pelaksana', 'Wahyu Hidayat', regular, bold)
  return Buffer.from(await pdf.save())
}
