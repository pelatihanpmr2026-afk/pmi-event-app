import { DIVISI_OPTIONS } from './constants'

export const KATEGORI_PEMASUKAN_OPTIONS = [
  { value: 'PENDAFTARAN', label: 'Pendaftaran' },
  { value: 'SEWA_TENDA', label: 'Sewa Tenda' },
  { value: 'SPONSOR', label: 'Sponsor' },
  { value: 'PERSENTASE_TENDA', label: 'Presentase Tenda' },
] as const

export const KATEGORI_PENGELUARAN_OPTIONS = [
  { value: 'SETOR_TENDA', label: 'Setor Tenda' },
  { value: 'OPERASIONAL_DIVISI', label: 'Operasional Divisi' },
  { value: 'BEBAN_PENGELUARAN', label: 'Beban Pengeluaran' },
] as const

// Placeholder — isi nama PIC tiap divisi di sini kapan saja.
// Divisi yang belum diisi otomatis tidak akan punya opsi PIC (form akan minta isi manual).
export const PIC_PER_DIVISI: Record<string, string[]> = {
  KOMANDAN: [],
  KETUA_PELAKSANA: [],
  WAKIL_KETUA: [],
  BENDAHARA: [],
  WAKIL_BENDAHARA_1: [],
  WAKIL_BENDAHARA_2: [],
  SEKRETARIS: [],
  WAKIL_SEKRETARIS: [],
  KESEKRETARIATAN: [],
  ACARA: [],
  HUMAS_DAN_DOKUMENTASI: [],
  GIAT: [],
  KEAMANAN_DAN_EVAKUASI: [],
  SANITASI: [],
  TRANSPORTASI: [],
  PERKEMAHAN: [],
  DAPUR_UMUM: [],
  PERALATAN: [],
  YANKES: [],
}

export { DIVISI_OPTIONS }