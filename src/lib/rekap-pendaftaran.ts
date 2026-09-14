import { prisma } from './prisma'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from './constants-sekolah'
import type { KategoriSekolah } from '@prisma/client'

export interface RekapPendaftaranRow {
  namaSekolah: string
  jumlahPeserta: number
  jumlahPendamping: number
  totalRp: number
}

export interface RekapTendaRow {
  namaSekolah: string
  jumlahTenda: number
  jenisTenda: string
  totalRp: number
}

export interface RekapPendaftaranData {
  pendaftaran: RekapPendaftaranRow[]
  tenda: RekapTendaRow[]
  totalJumlahPeserta: number
  totalJumlahPendamping: number
  totalJumlahTenda: number
  totalPendaftaran: number
  totalSewaTenda: number
  totalKeseluruhan: number
}

interface RowSortable {
  kategori: KategoriSekolah | null
  nomorPendaftaran: number | null
}

const URUTAN_KATEGORI: Record<KategoriSekolah, number> = { WIRA: 0, MADYA: 1 }

/**
 * Urutkan baris berdasarkan kategori (WIRA dahulu, lalu MADYA) dan
 * nomor pendaftaran menaik. Sekolah tanpa nomor pendaftaran diletakkan terakhir.
 */
function urutkan<R extends RowSortable>(rows: R[]): R[] {
  return [...rows].sort((a, b) => {
    const ka = a.kategori ? URUTAN_KATEGORI[a.kategori] : 99
    const kb = b.kategori ? URUTAN_KATEGORI[b.kategori] : 99
    if (ka !== kb) return ka - kb
    const na = a.nomorPendaftaran ?? Number.MAX_SAFE_INTEGER
    const nb = b.nomorPendaftaran ?? Number.MAX_SAFE_INTEGER
    return na - nb
  })
}

/**
 * Rekap harian pendaftaran.
 *
 * - Pendaftaran: sekolah yang TERDAFTAR pada tanggal tsb (batch asli, batchKe 1)
 *   DITAMBAH peserta/pendamping SUSULAN yang dibuat pada tanggal tsb
 *   (batchKe > 1). Susulan masuk ke rekap pada tanggal penambahan, BUKAN
 *   tanggal pendaftaran awal sekolah.
 * - Sewa tenda: berdasarkan tanggal TendaSewa dibuat (hanya LUNAS), diagregasi
 *   per sekolah.
 */
export async function getRekapPendaftaranData(start: Date, end: Date): Promise<RekapPendaftaranData> {
  const [sekolahDaftar, susulanPeserta, tendaSewaHariIni] = await Promise.all([
    prisma.sekolah.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        pembayaran: { some: { tipe: 'PESERTA', statusPembayaran: 'LUNAS' } },
      },
      include: { peserta: { select: { tipe: true, batchKe: true } } },
    }),
    prisma.peserta.findMany({
      where: {
        batchKe: { gt: 1 },
        createdAt: { gte: start, lte: end },
        sekolah: { pembayaran: { some: { tipe: 'PESERTA', statusPembayaran: 'LUNAS' } } },
      },
      select: {
        tipe: true,
        sekolahId: true,
        sekolah: { select: { namaLengkap: true, kategori: true, nomorPendaftaran: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.tendaSewa.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        sekolah: { pembayaran: { some: { tipe: 'TENDA', statusPembayaran: 'LUNAS' } } },
      },
      include: {
        sekolah: { select: { namaLengkap: true, kategori: true, nomorPendaftaran: true } },
        tendaJenis: { select: { nama: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  interface PendaftaranInternal extends RekapPendaftaranRow, RowSortable {}

  const pendaftaran: PendaftaranInternal[] = []
  const idxBySekolah = new Map<string, number>()

  function tambahRow(
    sekolahId: string,
    meta: { namaSekolah: string; kategori: KategoriSekolah | null; nomorPendaftaran: number | null },
    tipe?: 'PESERTA' | 'PENDAMPING'
  ) {
    let idx = idxBySekolah.get(sekolahId)
    if (idx === undefined) {
      pendaftaran.push({ ...meta, jumlahPeserta: 0, jumlahPendamping: 0, totalRp: 0 })
      idx = pendaftaran.length - 1
      idxBySekolah.set(sekolahId, idx)
    }
    const row = pendaftaran[idx]
    if (tipe === 'PESERTA') row.jumlahPeserta++
    else if (tipe === 'PENDAMPING') row.jumlahPendamping++
    row.totalRp = row.jumlahPeserta * BIAYA_PESERTA + row.jumlahPendamping * BIAYA_PENDAMPING
    return row
  }

  // Batch asli (batchKe 1): atribut ke tanggal pendaftaran sekolah.
  for (const s of sekolahDaftar) {
    const row = tambahRow(s.id, {
      namaSekolah: s.namaLengkap,
      kategori: s.kategori,
      nomorPendaftaran: s.nomorPendaftaran,
    })
    row.jumlahPeserta = s.peserta.filter((p) => p.tipe === 'PESERTA' && p.batchKe === 1).length
    row.jumlahPendamping = s.peserta.filter((p) => p.tipe === 'PENDAMPING' && p.batchKe === 1).length
    row.totalRp = row.jumlahPeserta * BIAYA_PESERTA + row.jumlahPendamping * BIAYA_PENDAMPING
  }

  // Susulan (batchKe > 1): atribut ke tanggal peserta susulan dibuat.
  for (const p of susulanPeserta) {
    tambahRow(
      p.sekolahId,
      {
        namaSekolah: p.sekolah.namaLengkap,
        kategori: p.sekolah.kategori,
        nomorPendaftaran: p.sekolah.nomorPendaftaran,
      },
      p.tipe
    )
  }

  interface TendaInternal extends RekapTendaRow, RowSortable {}

  const tendaBySekolah = new Map<string, TendaInternal>()
  for (const t of tendaSewaHariIni) {
    let row = tendaBySekolah.get(t.sekolahId)
    if (!row) {
      row = {
        namaSekolah: t.sekolah.namaLengkap,
        jumlahTenda: 0,
        jenisTenda: '',
        totalRp: 0,
        kategori: t.sekolah.kategori,
        nomorPendaftaran: t.sekolah.nomorPendaftaran,
      }
      tendaBySekolah.set(t.sekolahId, row)
    }
    row.jumlahTenda += t.jumlah
    row.totalRp += t.jumlah * t.hargaSatuanSaatSewa
    const label = t.jumlah > 1 ? `${t.tendaJenis.nama} x${t.jumlah}` : t.tendaJenis.nama
    row.jenisTenda = row.jenisTenda ? `${row.jenisTenda}, ${label}` : label
  }

  const pendaftaranTertata = urutkan<PendaftaranInternal>(pendaftaran)
  const tenda = urutkan<TendaInternal>([...tendaBySekolah.values()])

  const totalJumlahPeserta = pendaftaranTertata.reduce((s, r) => s + r.jumlahPeserta, 0)
  const totalJumlahPendamping = pendaftaranTertata.reduce((s, r) => s + r.jumlahPendamping, 0)
  const totalPendaftaran = pendaftaranTertata.reduce((s, r) => s + r.totalRp, 0)
  const totalJumlahTenda = tenda.reduce((s, r) => s + r.jumlahTenda, 0)
  const totalSewaTenda = tenda.reduce((s, r) => s + r.totalRp, 0)

  return {
    pendaftaran: pendaftaranTertata,
    tenda,
    totalJumlahPeserta,
    totalJumlahPendamping,
    totalJumlahTenda,
    totalPendaftaran,
    totalSewaTenda,
    totalKeseluruhan: totalPendaftaran + totalSewaTenda,
  }
}