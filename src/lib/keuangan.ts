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

export async function getKeuanganStatsData() {
  // ===== 1. PEMASUKAN PENDAFTARAN (online) =====
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

  const pendaftaranOnline =
    (pesertaWira + pesertaMadya) * BIAYA_PESERTA +
    (pendampingWira + pendampingMadya) * BIAYA_PENDAMPING

  // ===== 2. PEMASUKAN SEWA TENDA (online, gross) =====
  const tendaLunasAgg = await prisma.pembayaran.aggregate({
    where: { tipe: 'TENDA', statusPembayaran: 'LUNAS' },
    _sum: { jumlahBiaya: true },
  })
  const sewaTendaOnline = tendaLunasAgg._sum.jumlahBiaya ?? 0

  // ===== 3. HARUS DISETOR KE VENDOR =====
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

  // ===== TRANSAKSI MANUAL (ledger) =====
  const manualPemasukan = await prisma.transaksiKeuangan.groupBy({
    by: ['kategoriPemasukan'],
    where: { jenis: 'PEMASUKAN' },
    _sum: { debit: true },
  })

  function manualSum(kategori: string): number {
    return manualPemasukan.find((m) => m.kategoriPemasukan === kategori)?._sum.debit ?? 0
  }

  const pendaftaranManual = manualSum('PENDAFTARAN')
  const sewaTendaManual = manualSum('SEWA_TENDA')
  const sponsorManual = manualSum('SPONSOR')
  const persentaseTendaManual = manualSum('PERSENTASE_TENDA')

  const totalPengeluaranAgg = await prisma.transaksiKeuangan.aggregate({
    where: { jenis: 'PENGELUARAN' },
    _sum: { kredit: true },
  })
  const totalPengeluaran = totalPengeluaranAgg._sum.kredit ?? 0

  const totalUtangAgg = await prisma.transaksiKeuangan.aggregate({
    _sum: { utang: true },
  })
  const totalUtang = totalUtangAgg._sum.utang ?? 0

  // ===== OPERASIONAL DIVISI =====
  // Disetor dari 2 sumber yang sudah menjadi TransaksiKeuangan (bukan
  // double-count): pengajuan anggaran yang DISETUJUI (proses/route.ts
  // membuat transaksi kategori OPERASIONAL_DIVISI) + pengeluaran manual
  // dengan kategori OPERASIONAL_DIVISI. Dihitung per divisi.
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

  // ===== GABUNGKAN =====
  const pemasukanPendaftaran = pendaftaranOnline
  const pemasukanSewaTenda = sewaTendaOnline
  const keuntunganSewaTenda = pemasukanSewaTenda - harusDisetorVendor
  const pemasukanLainLain = sponsorManual + keuntunganSewaTenda

  const totalPemasukan =
    pemasukanPendaftaran + pemasukanSewaTenda + pemasukanLainLain

  const saldoBersih = pemasukanPendaftaran + pemasukanLainLain
  const saldoKotor = pemasukanPendaftaran + pemasukanSewaTenda
  const saldoAkhir = totalPemasukan - totalPengeluaran

  return {
    pemasukanPendaftaran: {
      total: pemasukanPendaftaran,
      breakdown: { pesertaWira, pesertaMadya, pendampingWira, pendampingMadya },
      breakdownNominal: {
        pesertaWira: pesertaWira * BIAYA_PESERTA,
        pesertaMadya: pesertaMadya * BIAYA_PESERTA,
        pendampingWira: pendampingWira * BIAYA_PENDAMPING,
        pendampingMadya: pendampingMadya * BIAYA_PENDAMPING,
      },
      manual: pendaftaranManual,
    },
    pemasukanSewaTenda: {
      total: pemasukanSewaTenda,
      online: sewaTendaOnline,
      manual: sewaTendaManual,
    },
    harusDisetorVendor,
    vendorBreakdown,
    keuntunganSewaTenda,
    pemasukanLainLain: {
      total: pemasukanLainLain,
      sponsor: sponsorManual,
      persentaseTenda: persentaseTendaManual,
      keuntunganTenda: keuntunganSewaTenda,
    },
    totalPemasukan,
    totalPengeluaran,
    saldoBersih,
    saldoKotor,
    saldoAkhir,
    totalUtang,
    operasionalDivisi: {
      total: totalOperasionalDivisi,
      breakdown: operasionalDivisiBreakdown,
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