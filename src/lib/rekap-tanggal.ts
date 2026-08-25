export interface RekapTanggalRange {
  start: Date
  end: Date
  label: string
  isAll: boolean
}

/**
 * Ubah nilai `tanggal` dari query param menjadi rentang tanggal.
 * Nilai khusus `all` berarti seluruh data (tanpa batas tanggal).
 */
export function resolveRekapTanggal(tanggalStr: string): RekapTanggalRange {
  if (tanggalStr === 'all') {
    return {
      start: new Date('2000-01-01T00:00:00'),
      end: new Date('2100-01-01T00:00:00'),
      label: 'Semua Tanggal',
      isAll: true,
    }
  }

  return {
    start: new Date(`${tanggalStr}T00:00:00`),
    end: new Date(`${tanggalStr}T23:59:59`),
    label: new Date(tanggalStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    isAll: false,
  }
}