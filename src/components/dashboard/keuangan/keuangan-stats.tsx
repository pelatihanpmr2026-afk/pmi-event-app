'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Wallet, Tent, Truck, TrendingUp, Gift, DollarSign, Receipt, Scale, PiggyBank, Briefcase } from 'lucide-react'
import type { KeuanganStatsData } from '@/lib/keuangan'
import { DIVISI_OPTIONS } from '@/lib/constants-keuangan'

function formatRp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

function divisiLabel(value: string) {
  return DIVISI_OPTIONS.find((d) => d.value === value)?.label ?? value
}

export function KeuanganStats({ data }: { data: KeuanganStatsData }) {
  const { breakdown, breakdownNominal } = data.pemasukanPendaftaran
  const [modal, setModal] = useState<'pendaftaran' | 'vendor' | 'operasional' | null>(null)

  const breakdownRows = [
    { label: 'Peserta Wira', jumlah: breakdown.pesertaWira, nominal: breakdownNominal.pesertaWira },
    { label: 'Pendamping Wira', jumlah: breakdown.pendampingWira, nominal: breakdownNominal.pendampingWira },
    { label: 'Peserta Madya', jumlah: breakdown.pesertaMadya, nominal: breakdownNominal.pesertaMadya },
    { label: 'Pendamping Madya', jumlah: breakdown.pendampingMadya, nominal: breakdownNominal.pendampingMadya },
  ]

  const operasionalRows = data.operasionalDivisi.breakdown.map((b) => ({
    label: divisiLabel(b.divisi ?? 'TANPA_DIVISI'),
    nominal: b.nominal,
  }))

  return (
    <div className="flex flex-col gap-4">
      {/* Baris 1: 4 Kartu Utama */}
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
            <span className="font-body text-2xl font-bold">{formatRp(data.pemasukanPendaftaran.total)}</span>
            <span className="font-body text-[10px] opacity-80">Klik untuk rincian</span>
          </Card>
        </button>

        <Card className="p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Tent size={18} />
            <span className="font-body text-xs text-gray-500">Pemasukan Sewa Tenda</span>
          </div>
          <span className="font-body text-2xl font-bold text-event-navy">{formatRp(data.pemasukanSewaTenda.total)}</span>
          <span className="font-body text-xs text-gray-400">Gross, sebelum setor vendor</span>
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
            <span className="font-body text-2xl font-bold text-pmi-red">{formatRp(data.harusDisetorVendor)}</span>
            <span className="font-body text-[10px] text-gray-400">Klik untuk rincian per vendor</span>
          </Card>
        </button>

        <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-yellow">
          <div className="flex items-center gap-2 text-event-navy">
            <TrendingUp size={18} />
            <span className="font-body text-xs text-gray-600">Keuntungan Sewa Tenda</span>
          </div>
          <span className="font-body text-2xl font-bold text-event-navy">{formatRp(data.keuntunganSewaTenda)}</span>
        </Card>
      </div>

      {/* Baris 2: 4 Kartu Pemasukan Lain & Saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Gift size={18} />
            <span className="font-body text-xs text-gray-500">Pemasukan Lain-lain</span>
          </div>
          <span className="font-body text-2xl font-bold text-event-navy">{formatRp(data.pemasukanLainLain.total)}</span>
          <div className="flex flex-col text-[10px] font-body text-gray-400 pt-1 border-t border-[var(--color-border)]">
            <span>Sponsor: {formatRp(data.pemasukanLainLain.sponsor)}</span>
            <span>Keuntungan Sewa Tenda: {formatRp(data.pemasukanLainLain.keuntunganTenda)}</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-navy text-white">
          <div className="flex items-center gap-2">
            <DollarSign size={18} />
            <span className="font-body text-xs font-medium">Total Pemasukan</span>
          </div>
          <span className="font-body text-2xl font-bold">{formatRp(data.totalPemasukan)}</span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-pmi-red text-white">
          <div className="flex items-center gap-2">
            <Receipt size={18} />
            <span className="font-body text-xs font-medium">Total Pengeluaran</span>
          </div>
          <span className="font-body text-2xl font-bold">{formatRp(data.totalPengeluaran)}</span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-pink text-white">
          <div className="flex items-center gap-2">
            <PiggyBank size={18} />
            <span className="font-body text-xs font-medium">Saldo Akhir</span>
          </div>
          <span className="font-body text-2xl font-bold">{formatRp(data.saldoAkhir)}</span>
          <span className="font-body text-[10px] opacity-80">Pemasukan − Pengeluaran</span>
        </Card>
      </div>

      {/* Baris 3: 4 Kartu Tambahan */}
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
            <span className="font-body text-lg font-bold text-event-navy">{formatRp(data.operasionalDivisi.total)}</span>
            <span className="font-body text-xs text-gray-400">Pengajuan disetujui + input manual</span>
          </Card>
        </button>

        <Card className="p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Scale size={18} />
            <span className="font-body text-xs text-gray-500">Saldo Bersih</span>
          </div>
          <span className="font-body text-lg font-bold text-event-navy">{formatRp(data.saldoBersih)}</span>
          <span className="font-body text-xs text-gray-400">Pendaftaran + Pemasukkan Lain-lain</span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Scale size={18} />
            <span className="font-body text-xs text-gray-500">Saldo Kotor</span>
          </div>
          <span className="font-body text-lg font-bold text-event-navy">{formatRp(data.saldoKotor)}</span>
          <span className="font-body text-xs text-gray-400">Pendaftaran + Sewa Tenda (gross)</span>
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Receipt size={18} />
            <span className="font-body text-xs text-gray-500">Total Utang</span>
          </div>
          <span className="font-body text-lg font-bold text-event-navy">{formatRp(data.totalUtang)}</span>
        </Card>
      </div>

      <Modal
        isOpen={modal === 'pendaftaran'}
        onClose={() => setModal(null)}
        title="RINCIAN PEMASUKAN PENDAFTARAN"
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
            <span className="font-body font-bold text-sm text-event-navy">{formatRp(data.pemasukanPendaftaran.total)}</span>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal === 'vendor'}
        onClose={() => setModal(null)}
        title="RINCIAN SETORAN VENDOR"
      >
        {data.vendorBreakdown.length === 0 ? (
          <p className="font-body text-sm text-event-navy/60">
            Belum ada kewajiban setor ke vendor.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.vendorBreakdown.map((row) => (
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
              <span className="font-body font-bold text-sm text-event-navy">{formatRp(data.harusDisetorVendor)}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={modal === 'operasional'}
        onClose={() => setModal(null)}
        title="RINCIAN OPERASIONAL DIVISI"
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
              <span className="font-body font-bold text-sm text-event-navy">{formatRp(data.operasionalDivisi.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}