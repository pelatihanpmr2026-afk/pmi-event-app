import { prisma } from './prisma'
import { DIVISI_CAPACITY } from './constants'

/**
 * Kuota maksimal orang per divisi.
 *
 * Pengaturan dinamis disimpan di tabel `divisi_kuota` (bisa diubah admin).
 * DIVISI_CAPACITY di constants.ts dipakai sebagai nilai awal/fallback — jika
 * sebuah divisi belum punya baris kuota, gunakan nilai default-nya.
 */
export async function getDivisiKuota(): Promise<Record<string, number>> {
  const rows = await prisma.divisiKuota.findMany()
  const kuota: Record<string, number> = { ...DIVISI_CAPACITY }
  for (const row of rows) {
    kuota[row.divisi] = row.maksimal
  }
  return kuota
}

/** Ambil kuota satu divisi (fallback ke default jika belum diset). */
export async function getDivisiKuotaSingle(divisi: string): Promise<number | undefined> {
  const row = await prisma.divisiKuota.findUnique({ where: { divisi: divisi as never } })
  if (row) return row.maksimal
  return DIVISI_CAPACITY[divisi]
}