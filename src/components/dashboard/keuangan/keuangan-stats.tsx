'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { AlertTriangle, Wallet, Tent, Truck, TrendingUp, DollarSign, Receipt, Scale, PiggyBank, Briefcase } from 'lucide-react'
import type { KeuanganStatsData } from '@/lib/keuangan'
import { DIVISI_OPTIONS } from '@/lib/constants-keuangan'

function formatRp(n: number) {
  const absolute = Math.abs(n).toLocaleString('id-ID')
  return n < 0 ? `-Rp${absolute}` : `Rp${absolute}`
}

function divisiLabel(value: string) {
  return DIVISI_OPTIONS.find((d) => d.value === value)?.label ?? value
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading text-[11px] text-event-navy tracking-wide">{children}</h2>
  )
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body text-[10px] text-[var(--color-text-muted)]">{children}</p>
  )
}

export function KeuanganStats({ data }: { data: KeuanganStatsData }) {
  const { breakdown, breakdownNominal } = data.estimasi.pemasukanPendaftaran
  const [modal, setModal] = useState<'pendaftaran' | 'vendor' | 'operasional' | null>(null)

  const breakdownRows = [
    { label: 'Peserta Wira', jumlah: breakdown.pesertaWira, nominal: breakdownNominal.pesertaWira },
    { label: 'Pendamping Wira', jumlah: breakdown.pendampingWira, nominal: breakdownNominal.pendampingWira },
    { label: 'Peserta Madya', jumlah: breakdown.pesertaMadya, nominal: breakdownNominal.pesertaMadya },
    { label: 'Pendamping Madya', jumlah: breakdown.pendampingMadya, nominal: breakdownNominal.pendampingMadya },
  ]

  const operasionalRows = data.bukuKas.operasionalDivisi.breakdown.map((b) => ({
    label: divisiLabel(b.divisi ?? 'TANPA_DIVISI'),
    nominal: b.nominal,
  }))

  const selisih = data.keseimbangan.selisih
  const selisihLabel = selisih === 0
    ? 'Sinkron dengan buku kas'
    : selisih > 0
      ? 'Perkiraan belum tercatat di buku kas'
      : 'Pemasukan buku kas melebihi perkiraan'
  const selisihClass = selisih === 0
    ? 'bg-green-600 text-white'
    : selisih > 0
      ? 'bg-amber-500 text-white'
      : 'bg-event-blue text-white'

  return (
    <div className="flex flex-col gap-4">
      {/* ===== 1. ESTIMASI PEMASUKAN (OTOMATIS) ===== */}
      <div className="flex flex-col gap-2">
        <SectionLabel>ESTIMASI PEMASUKAN (OTOMATIS)</SectionLabel>
        <SectionNote>
          Dihitung otomatis dari data pendaftaran & pembayaran — angka perkiraan, bukan catatan uang masuk riil.
        </SectionNote>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setModal('pendaftaran')}
          className="text-left cursor-pointer p-0 border-0 bg-transparent"
        >
          <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-blue text-white h-full">
            <div className="flex items-center gap-2">
              <Wallet size={18} />
              <span className="font-body text-xs font-medium">Pemasukan Pendaftaran</span>
            </div>
            <span className="font-body text-2xl font-bold">{formatRp(data.estimasi.pemasukanPendaftaran.total)}</span>
            <span className="font-body text-[10px] opacity-80">Estimasi · klik untuk rincian</span>
          </Card>
        </button>

        <Card className="p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Tent size={18} />
            <span className="font-body text-xs text-gray-500">Pemasukan Sewa Tenda</span>
          </div>
          <span className="font-body text-2xl font-bold text-event-navy">{formatRp(data.estimasi.pemasukanSewaTenda.total)}</span>
          <span className="font-body text-xs text-gray-400">Estimasi gross, sebelum setor vendor</span>
        </Card>

        <button
          type="button"
          onClick={() => setModal('vendor')}
          className="text-left cursor-pointer p-0 border-0 bg-transparent"
        >
          <Card className="p-4 sm:p-5 flex flex-col gap-2 h-full">
            <div className="flex items-center gap-2 text-event-navy">
              <Truck size={18} />
              <span className="font-body text-xs text-gray-500">Harus Disetor Vendor</span>
            </div>
            <span className="font-body text-2xl font-bold text-pmi-red">{formatRp(data.estimasi.harusDisetorVendor)}</span>
            <span className="font-body text-[10px] text-gray-400">Estimasi · klik untuk rincian per vendor</span>
          </Card>
        </button>

        <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-yellow">
          <div className="flex items-center gap-2 text-event-navy">
            <TrendingUp size={18} />
            <span className="font-body text-xs text-gray-600">Keuntungan Sewa Tenda</span>
          </div>
          <span className="font-body text-2xl font-bold text-event-navy">{formatRp(data.estimasi.keuntunganSewaTenda)}</span>
          <span className="font-body text-[10px] text-gray-400">Estimasi · gross dikurangi setor vendor</span>
        </Card>
      </div>

      {/* ===== 2. BUKU KAS (INPUT MANUAL) ===== */}
      <div className="flex flex-col gap-2">
        <SectionLabel>BUKU KAS (INPUT MANUAL)</SectionLabel>
        <SectionNote>
          Catatan jurnal transaksi keuangan — total & saldo di grup ini pasti sama dengan tabel Buku Kas di bawah.
        </SectionNote>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-navy text-white">
          <div className="flex items-center gap-2">
            <DollarSign size={18} />
            <span className="font-body text-xs font-medium">Total Pemasukan Buku Kas</span>
          </div>
          <span className="font-body text-2xl font-bold">{formatRp(data.bukuKas.pemasukan.total)}</span>
          <div className="flex flex-col text-[10px] font-body opacity-80 pt-1 border-t border-white/20">
            <span>Pendaftaran: {formatRp(data.bukuKas.pemasukan.pendaftaran)}</span>
            <span>Sewa Tenda: {formatRp(data.bukuKas.pemasukan.sewaTenda)}</span>
            <span>Sponsor: {formatRp(data.bukuKas.pemasukan.sponsor)}</span>
            <span>Persentase Tenda: {formatRp(data.bukuKas.pemasukan.persentaseTenda)}</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-pmi-red text-white">
          <div className="flex items-center gap-2">
            <Receipt size={18} />
            <span className="font-body text-xs font-medium">Total Pengeluaran Buku Kas</span>
          </div>
          <span className="font-body text-2xl font-bold">{formatRp(data.bukuKas.pengeluaran.total)}</span>
          <span className="font-body text-[10px] opacity-80">
            Termasuk setor tenda: {formatRp(data.bukuKas.pengeluaran.setorTenda)}
          </span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-pink text-white">
          <div className="flex items-center gap-2">
            <PiggyBank size={18} />
            <span className="font-body text-xs font-medium">Saldo Buku Kas</span>
          </div>
          <span className="font-body text-2xl font-bold">{formatRp(data.bukuKas.saldo)}</span>
          <span className="font-body text-[10px] opacity-80">Sama dengan saldo akhir tabel Buku Kas</span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Scale size={18} />
            <span className="font-body text-xs text-gray-500">Total Utang</span>
          </div>
          <span className="font-body text-lg font-bold text-event-navy">{formatRp(data.bukuKas.utang)}</span>
        </Card>
      </div>

      {/* ===== 3. KESEIMBANGAN ===== */}
      <div className="flex flex-col gap-2">
        <SectionLabel>KESEIMBANGAN & PEMBANDING</SectionLabel>
        <SectionNote>
          Selisih estimasi (otomatis) dibanding buku kas (manual) — sasarannya 0 setelah semua pemasukan dicatat.
        </SectionNote>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setModal('operasional')}
          className="text-left cursor-pointer p-0 border-0 bg-transparent"
        >
          <Card className="p-4 sm:p-5 flex flex-col gap-2 h-full">
            <div className="flex items-center gap-2 text-event-navy">
              <Briefcase size={18} />
              <span className="font-body text-xs text-gray-500">Operasional Divisi</span>
            </div>
            <span className="font-body text-lg font-bold text-event-navy">{formatRp(data.bukuKas.operasionalDivisi.total)}</span>
            <span className="font-body text-xs text-gray-400">Pengajuan disetujui + input manual · klik rincian</span>
          </Card>
        </button>

        <Card className={`p-4 sm:p-5 flex flex-col gap-2 ${selisihClass}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <span className="font-body text-xs font-medium">Selisih Estimasi vs Buku Kas</span>
          </div>
          <span className="font-body text-2xl font-bold">{formatRp(Math.round(selisih))}</span>
          <span className="font-body text-[10px] opacity-80">{selisihLabel}</span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Scale size={18} />
            <span className="font-body text-xs text-gray-500">Saldo Bersih (Estimasi)</span>
          </div>
          <span className="font-body text-lg font-bold text-event-navy">{formatRp(data.estimasi.saldoBersih)}</span>
          <span className="font-body text-xs text-gray-400">Pendaftaran + keuntungan tenda</span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Wallet size={18} />
            <span className="font-body text-xs text-gray-500">Saldo Kotor (Estimasi)</span>
          </div>
          <span className="font-body text-lg font-bold text-event-navy">{formatRp(data.estimasi.saldoKotor)}</span>
          <span className="font-body text-xs text-gray-400">Pendaftaran + sewa tenda (gross)</span>
        </Card>
      </div>

      <Modal
        isOpen={modal === 'pendaftaran'}
        onClose={() => setModal(null)}
        title="RINCIAN PEMASUKAN PENDAFTARAN (ESTIMASI)"
      >
        <div className="flex flex-col gap-2">
          {breakdownRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-[var(--color-border)] pb-2"
            >
              <div className="flex flex-col">
                <span className="font-body text-sm text-event-navy">{row.label}</span>
                <span className="font-body text-xs text-gray-400">{row.jumlah} orang</span>
              </div>
              <span className="font-body font-bold text-sm text-event-navy">{formatRp(row.nominal)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <span className="font-body font-bold text-sm text-event-navy">Total</span>
            <span className="font-body font-bold text-sm text-event-navy">{formatRp(data.estimasi.pemasukanPendaftaran.total)}</span>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal === 'vendor'}
        onClose={() => setModal(null)}
        title="RINCIAN SETORAN VENDOR (ESTIMASI)"
      >
        {data.estimasi.vendorBreakdown.length === 0 ? (
          <p className="font-body text-sm text-event-navy/60">
            Belum ada kewajiban setor ke vendor.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.estimasi.vendorBreakdown.map((row) => (
              <div
                key={row.vendor}
                className="flex items-center justify-between border-b border-[var(--color-border)] pb-2"
              >
                <span className="font-body text-sm text-event-navy">{row.vendor}</span>
                <span className="font-body font-bold text-sm text-event-navy">{formatRp(row.nominal)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="font-body font-bold text-sm text-event-navy">Total</span>
              <span className="font-body font-bold text-sm text-event-navy">{formatRp(data.estimasi.harusDisetorVendor)}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={modal === 'operasional'}
        onClose={() => setModal(null)}
        title="RINCIAN OPERASIONAL DIVISI (BUKU KAS)"
      >
        {operasionalRows.length === 0 ? (
          <p className="font-body text-sm text-event-navy/60">
            Belum ada pengeluaran operasional divisi.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {operasionalRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-[var(--color-border)] pb-2"
              >
                <span className="font-body text-sm text-event-navy">{row.label}</span>
                <span className="font-body font-bold text-sm text-event-navy">{formatRp(row.nominal)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="font-body font-bold text-sm text-event-navy">Total</span>
              <span className="font-body font-bold text-sm text-event-navy">{formatRp(data.bukuKas.operasionalDivisi.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}