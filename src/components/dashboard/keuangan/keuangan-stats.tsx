import { Card } from '@/components/ui/card'
import { Wallet, Tent, Truck, TrendingUp, Gift, DollarSign, Receipt, Scale, PiggyBank } from 'lucide-react'
import type { KeuanganStatsData } from '@/lib/keuangan'

function formatRp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function KeuanganStats({ data }: { data: KeuanganStatsData }) {
  const { breakdown } = data.pemasukanPendaftaran

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 flex flex-col gap-2 bg-event-blue text-white">
          <div className="flex items-center gap-2">
            <Wallet size={18} />
            <span className="font-body text-xs">Pemasukan Pendaftaran</span>
          </div>
          <span className="font-heading text-lg">{formatRp(data.pemasukanPendaftaran.total)}</span>
          <div className="grid grid-cols-2 gap-1 text-[10px] font-body opacity-90 pt-1.5 border-t border-white/20">
            <span>Peserta Wira: {breakdown.pesertaWira}</span>
            <span>Peserta Madya: {breakdown.pesertaMadya}</span>
            <span>Pendamping Wira: {breakdown.pendampingWira}</span>
            <span>Pendamping Madya: {breakdown.pendampingMadya}</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Tent size={18} />
            <span className="font-body text-xs">Pemasukan Sewa Tenda</span>
          </div>
          <span className="font-heading text-lg text-event-navy">
            {formatRp(data.pemasukanSewaTenda.total)}
          </span>
          <span className="font-body text-[10px] text-event-navy/50">Gross, sebelum setor vendor</span>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Truck size={18} />
            <span className="font-body text-xs">Harus Disetor Vendor</span>
          </div>
          <span className="font-heading text-lg text-pmi-red">{formatRp(data.harusDisetorVendor)}</span>
        </Card>

        <Card className="p-4 flex flex-col gap-2 bg-event-yellow">
          <div className="flex items-center gap-2 text-event-navy">
            <TrendingUp size={18} />
            <span className="font-body text-xs">Keuntungan Sewa Tenda</span>
          </div>
          <span className="font-heading text-lg text-event-navy">
            {formatRp(data.keuntunganSewaTenda)}
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Gift size={18} />
            <span className="font-body text-xs">Pemasukan Lain-lain</span>
          </div>
          <span className="font-heading text-lg text-event-navy">
            {formatRp(data.pemasukanLainLain.total)}
          </span>
          <div className="flex flex-col text-[10px] font-body text-event-navy/50 pt-1.5 border-t border-event-navy/10">
            <span>Sponsor: {formatRp(data.pemasukanLainLain.sponsor)}</span>
            <span>Presentase Tenda: {formatRp(data.pemasukanLainLain.persentaseTenda)}</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2 bg-event-navy text-white">
          <div className="flex items-center gap-2">
            <DollarSign size={18} />
            <span className="font-body text-xs">Total Pemasukan</span>
          </div>
          <span className="font-heading text-lg">{formatRp(data.totalPemasukan)}</span>
        </Card>

        <Card className="p-4 flex flex-col gap-2 bg-pmi-red text-white">
          <div className="flex items-center gap-2">
            <Receipt size={18} />
            <span className="font-body text-xs">Total Pengeluaran</span>
          </div>
          <span className="font-heading text-lg">{formatRp(data.totalPengeluaran)}</span>
        </Card>

        <Card className="p-4 flex flex-col gap-2 bg-event-pink text-white">
          <div className="flex items-center gap-2">
            <PiggyBank size={18} />
            <span className="font-body text-xs">Saldo Akhir</span>
          </div>
          <span className="font-heading text-lg">{formatRp(data.saldoAkhir)}</span>
          <span className="font-body text-[10px] opacity-80">Pemasukan − Pengeluaran</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Scale size={18} />
            <span className="font-body text-xs">Saldo Bersih</span>
          </div>
          <span className="font-heading text-base text-event-navy">{formatRp(data.saldoBersih)}</span>
          <span className="font-body text-[10px] text-event-navy/50">Pendaftaran + Lain-lain</span>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Scale size={18} />
            <span className="font-body text-xs">Saldo Kotor</span>
          </div>
          <span className="font-heading text-base text-event-navy">{formatRp(data.saldoKotor)}</span>
          <span className="font-body text-[10px] text-event-navy/50">
            Pendaftaran + Sewa Tenda (gross)
          </span>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Receipt size={18} />
            <span className="font-body text-xs">Total Utang</span>
          </div>
          <span className="font-heading text-base text-event-navy">{formatRp(data.totalUtang)}</span>
        </Card>
      </div>
    </div>
  )
}