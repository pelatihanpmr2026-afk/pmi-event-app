export function formatNoPeserta(nomorPendaftaranSekolah: number, urutanDalamSekolah: number): string {
  return `${String(nomorPendaftaranSekolah).padStart(2, '0')}-${String(urutanDalamSekolah).padStart(3, '0')}`
}