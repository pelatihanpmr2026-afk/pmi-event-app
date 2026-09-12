import { prisma } from './prisma'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from './constants-sekolah'
import { KATEGORI_PEMASUKAN_OPTIONS, KATEGORI_PENGELUARAN_OPTIONS } from './constants-keuangan'

export function getUraianLabel(
  jenis: 'PEMASUKAN' | 'PENGELUARAN' | 'UTANG',
  kategoriPemasukan: string | null,
  kategoriPengeluaran: string | null
): string {
  if (jenis === 'UTANG') return 'Utang'
  if (jenis === 'PEMASUKAN') {
    return (
      KATEGORI_PEMASUKAN_OPTIONS.find((o) => o.value === kategoriPemasukan)?.label ?? 'Pemasukan'
    )
  }
  return (
    KATEGORI_PENGELUARAN_OPTIONS.find((o) => o.value === kategoriPengeluaran)?.label ??
    'Pengeluaran'
  )
}

/**
 * Statistik keuangan dipisah tegas menjadi dua basis yang berbeda:
 *
 * - `estimasi`: penghasilan yang DIPERKIRAKAN dari data pendaftaran/pembayaran
 *   secara live (basis akrual). Belum tentu tercatat di buku kas.
 * - `bukuKas`: catatan sebenarnya dari tabel `TransaksiKeuangan` (basis kas).
 *   `bukuKas.saldo` dijamin SAMA dengan saldo berjalan terakhir tabel keuangan.
 *
 * Keduanya disandingkan lewat `keseimbangan.selisih` agar selisihnya terlihat
 * eksplisit, bukan membuat kartu "saldo akhir" yang mencampur dua basis.
 */
export async function getKeuanganStatsData() {
  // ===== 1. ESTIMASI OTOMATIS (live dari data pendaftaran/pembayaran) =====
  const sekolahPesertaLunas = await prisma.sekolah.findMany({
    where: { pembayaran: { some: { tipe: 'PESERTA', statusPembayaran: 'LUNAS' } } },
    select: {
      kategori: true,
      peserta: { select: { tipe: true } },
    },
  })

  let pesertaWira = 0
  let pesertaMadya = 0
  let pendampingWira = 0
  let pendampingMadya = 0

  for (const s of sekolahPesertaLunas) {
    for (const p of s.peserta) {
      if (p.tipe === 'PESERTA') {
        if (s.kategori === 'WIRA') pesertaWira++
        else pesertaMadya++
      } else {
        if (s.kategori === 'WIRA') pendampingWira++
        else pendampingMadya++
      }
    }
  }

  const pemasukanPendaftaran =
    (pesertaWira + pesertaMadya) * BIAYA_PESERTA +
    (pendampingWira + pendampingMadya) * BIAYA_PENDAMPING

  const tendaLunasAgg = await prisma.pembayaran.aggregate({
    where: { tipe: 'TENDA', statusPembayaran: 'LUNAS' },
    _sum: { jumlahBiaya: true },
  })
  const sewaTendaOnline = tendaLunasAgg._sum.jumlahBiaya ?? 0

  const sekolahTendaLunas = await prisma.sekolah.findMany({
    where: { pembayaran: { some: { tipe: 'TENDA', statusPembayaran: 'LUNAS' } } },
    select: {
      tendaSewa: {
        select: { jumlah: true, tendaJenis: { select: { nama: true, namaVendor: true, hargaVendor: true } } },
      },
    },
  })

  const vendorMap = new Map<string, { vendor: string; nominal: number }>()
  let harusDisetorVendor = 0
  for (const s of sekolahTendaLunas) {
    for (const t of s.tendaSewa) {
      const nominal = t.jumlah * t.tendaJenis.hargaVendor
      harusDisetorVendor += nominal
      const vendor = t.tendaJenis.namaVendor?.trim() || 'Vendor Belum Diisi'
      const existing = vendorMap.get(vendor)
      if (existing) existing.nominal += nominal
      else vendorMap.set(vendor, { vendor, nominal })
    }
  }
  const vendorBreakdown = [...vendorMap.values()].sort((a, b) => b.nominal - a.nominal)
  const keuntunganSewaTenda = sewaTendaOnline - harusDisetorVendor

  const saldoBersihEstimasi = pemasukanPendaftaran + keuntunganSewaTenda
  const saldoKotorEstimasi = pemasukanPendaftaran + sewaTendaOnline

  // ===== 2. BUKU KAS (jurnal TransaksiKeuangan) =====
  const manualPemasukan = await prisma.transaksiKeuangan.groupBy({
    by: ['kategoriPemasukan'],
    where: { jenis: 'PEMASUKAN' },
    _sum: { debit: true },
  })

  function manualSum(kategori: string): number {
    return manualPemasukan.find((m) => m.kategoriPemasukan === kategori)?._sum.debit ?? 0
  }

  const pemasukanPendaftaranManual = manualSum('PENDAFTARAN')
  const pemasukanSewaTendaManual = manualSum('SEWA_TENDA')
  const sponsorManual = manualSum('SPONSOR')
  const persentaseTendaManual = manualSum('PERSENTASE_TENDA')

  const pemasukanBukuKas =
    pemasukanPendaftaranManual + pemasukanSewaTendaManual + sponsorManual + persentaseTendaManual

  const totalPengeluaranAgg = await prisma.transaksiKeuangan.aggregate({
    where: { jenis: 'PENGELUARAN' },
    _sum: { kredit: true },
  })
  const totalPengeluaran = totalPengeluaranAgg._sum.kredit ?? 0

  const setorTendaAgg = await prisma.transaksiKeuangan.aggregate({
    where: { jenis: 'PENGELUARAN', kategoriPengeluaran: 'SETOR_TENDA' },
    _sum: { kredit: true },
  })
  const setorTendaKredit = setorTendaAgg._sum.kredit ?? 0

  const totalUtangAgg = await prisma.transaksiKeuangan.aggregate({
    _sum: { utang: true },
  })
  const totalUtang = totalUtangAgg._sum.utang ?? 0

  const operasionalDivisiAgg = await prisma.transaksiKeuangan.groupBy({
    by: ['divisi'],
    where: { jenis: 'PENGELUARAN', kategoriPengeluaran: 'OPERASIONAL_DIVISI' },
    _sum: { kredit: true },
  })
  const operasionalDivisiBreakdown = operasionalDivisiAgg.map((m) => ({
    divisi: m.divisi,
    nominal: m._sum.kredit ?? 0,
  }))
  const totalOperasionalDivisi = operasionalDivisiBreakdown.reduce((acc, m) => acc + m.nominal, 0)

  const saldoBukuKas = pemasukanBukuKas - totalPengeluaran

  // ===== 3. KESEIMBANGAN (selisih dua basis) =====
  const pemasukanNetBukuKas = pemasukanBukuKas - setorTendaKredit
  const selisih = saldoBersihEstimasi - pemasukanNetBukuKas

  return {
    estimasi: {
      pemasukanPendaftaran: {
        total: pemasukanPendaftaran,
        breakdown: { pesertaWira, pesertaMadya, pendampingWira, pendampingMadya },
        breakdownNominal: {
          pesertaWira: pesertaWira * BIAYA_PESERTA,
          pesertaMadya: pesertaMadya * BIAYA_PESERTA,
          pendampingWira: pendampingWira * BIAYA_PENDAMPING,
          pendampingMadya: pendampingMadya * BIAYA_PENDAMPING,
        },
      },
      pemasukanSewaTenda: {
        total: sewaTendaOnline,
      },
      harusDisetorVendor,
      vendorBreakdown,
      keuntunganSewaTenda,
      saldoBersih: saldoBersihEstimasi,
      saldoKotor: saldoKotorEstimasi,
    },
    bukuKas: {
      pemasukan: {
        total: pemasukanBukuKas,
        pendaftaran: pemasukanPendaftaranManual,
        sewaTenda: pemasukanSewaTendaManual,
        sponsor: sponsorManual,
        persentaseTenda: persentaseTendaManual,
      },
      pengeluaran: {
        total: totalPengeluaran,
        setorTenda: setorTendaKredit,
      },
      saldo: saldoBukuKas,
      utang: totalUtang,
      operasionalDivisi: {
        total: totalOperasionalDivisi,
        breakdown: operasionalDivisiBreakdown,
      },
    },
    keseimbangan: {
      estimasiPendapatan: saldoBersihEstimasi,
      pemasukanNetBukuKas,
      selisih,
    },
  }
}

export type KeuanganStatsData = Awaited<ReturnType<typeof getKeuanganStatsData>>

export function formatRp(n: number) {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}


export async function getTransaksiListData() {
  const transaksi = await prisma.transaksiKeuangan.findMany({
    orderBy: [{ tanggal: 'asc' }, { createdAt: 'asc' }],
    include: { pengajuan: { select: { nomorPengajuan: true } } },
  })

  let saldoBerjalan = 0
  return transaksi.map((t) => {
    saldoBerjalan += t.debit - t.kredit
    return {
      id: t.id,
      tanggal: t.tanggal.toISOString(),
      keterangan: t.keterangan,
      uraian: getUraianLabel(t.jenis, t.kategoriPemasukan, t.kategoriPengeluaran),
      jenis: t.jenis,
      kategoriPemasukan: t.kategoriPemasukan,
      kategoriPengeluaran: t.kategoriPengeluaran,
      debit: t.debit,
      kredit: t.kredit,
      utang: t.utang,
      saldo: saldoBerjalan,
      divisi: t.divisi,
      pic: t.pic,
      pengajuanId: t.pengajuanId,
      nomorPengajuan: t.pengajuan?.nomorPengajuan ?? null,
    }
  })
}

export type TransaksiListItem = Awaited<ReturnType<typeof getTransaksiListData>>[number]