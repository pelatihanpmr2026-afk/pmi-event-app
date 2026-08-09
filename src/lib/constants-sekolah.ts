export const JENJANG_OPTIONS = [
  { value: 'SMP', label: 'SMP' },
  { value: 'MTS', label: 'MTs' },
  { value: 'SMA', label: 'SMA' },
  { value: 'SMK', label: 'SMK' },
  { value: 'MA', label: 'MA' },
] as const

export const STATUS_SEKOLAH_OPTIONS = [
  { value: 'NEGERI', label: 'Negeri' },
  { value: 'SWASTA', label: 'Swasta' },
] as const

export const AGAMA_OPTIONS = [
  { value: 'ISLAM', label: 'Islam' },
  { value: 'KRISTEN', label: 'Kristen' },
  { value: 'KATOLIK', label: 'Katolik' },
  { value: 'HINDU', label: 'Hindu' },
  { value: 'BUDDHA', label: 'Buddha' },
  { value: 'KONGHUCU', label: 'Konghucu' },
  { value: 'LAINNYA', label: 'Lainnya' },
] as const

export const GOLONGAN_DARAH_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'AB', label: 'AB' },
  { value: 'O', label: 'O' },
  { value: 'TIDAK_TAHU', label: 'Tidak Tahu' },
] as const

export const BIAYA_PESERTA = 35000
export const BIAYA_PENDAMPING = 25000

export const TENDA_TOLERANSI = 15 // toleransi kapasitas tambahan dari panitia

export interface TendaSeedData {
  nama: string
  kapasitasMin: number
  kapasitasMax: number
  harga: number
  stokTotal: number
}

export const TENDA_SEED_DATA: TendaSeedData[] = [
  { nama: 'Tenda Dome', kapasitasMin: 10, kapasitasMax: 12, harga: 400000, stokTotal: 5 },
  { nama: 'Tenda Regu BPBD', kapasitasMin: 13, kapasitasMax: 15, harga: 500000, stokTotal: 5 },
  { nama: 'Tenda Family Dinsos', kapasitasMin: 15, kapasitasMax: 17, harga: 550000, stokTotal: 5 },
  { nama: 'Tenda Dome Besar', kapasitasMin: 20, kapasitasMax: 25, harga: 600000, stokTotal: 5 },
  { nama: 'Tenda Family', kapasitasMin: 35, kapasitasMax: 40, harga: 750000, stokTotal: 5 },
  { nama: 'Tenda Army Dinsos', kapasitasMin: 40, kapasitasMax: 45, harga: 950000, stokTotal: 5 },
  { nama: 'Tenda Pleton', kapasitasMin: 80, kapasitasMax: 90, harga: 1200000, stokTotal: 5 },
  { nama: 'Tenda Merah Putih Dinsos', kapasitasMin: 100, kapasitasMax: 110, harga: 1300000, stokTotal: 5 },
]

export const REKENING_INFO = {
  namaBank: 'BANK XXXX (placeholder)',
  nomorRekening: '0000000000',
  atasNama: 'PMI Kabupaten Cianjur (placeholder)',
}

export const ACCEPTED_BUKTI_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
export const MAX_BUKTI_SIZE = 5 * 1024 * 1024 // 5MB

export const STATUS_PEMBAYARAN_CONFIG = {
  BELUM_BAYAR: { label: 'Belum Bayar', variant: 'warning' as const },
  MENUNGGU_KONFIRMASI: { label: 'Menunggu Konfirmasi', variant: 'info' as const },
  LUNAS: { label: 'Lunas', variant: 'success' as const },
  DITOLAK: { label: 'Ditolak', variant: 'danger' as const },
}

export const RIWAYAT_PENYAKIT_OPTIONS = [
  { value: 'TIDAK_ADA', label: 'Tidak Ada Riwayat Penyakit' },
  { value: 'ASMA_BERAT', label: 'Asma (Sedang - Berat)' },
  { value: 'EPILEPSI', label: 'Epilepsi / Ayan' },
  { value: 'JANTUNG', label: 'Penyakit Jantung' },
  { value: 'DIABETES', label: 'Diabetes' },
  { value: 'HIPERTENSI_BERAT', label: 'Hipertensi (Tekanan Darah Tinggi)' },
  { value: 'GANGGUAN_GINJAL', label: 'Gangguan Ginjal' },
  { value: 'GANGGUAN_PERNAPASAN_KRONIS', label: 'Gangguan Pernapasan Kronis' },
  { value: 'RIWAYAT_KEJANG', label: 'Riwayat Kejang' },
  { value: 'HEMOFILIA', label: 'Hemofilia (Gangguan Pembekuan Darah)' },
  { value: 'ANEMIA_BERAT', label: 'Anemia Berat' },
  { value: 'LAINNYA', label: 'Lainnya' },
] as const

// Dipakai untuk penanda visual di dashboard admin & halaman verifikasi kwitansi —
// semua nilai KECUALI 'TIDAK_ADA' dianggap perlu perhatian khusus.
export const RIWAYAT_PENYAKIT_PERLU_PERHATIAN: string[] = RIWAYAT_PENYAKIT_OPTIONS.filter(
  (o) => o.value !== 'TIDAK_ADA'
).map((o) => o.value)