import { Card } from '@/components/ui/card'
import { School, Users, UserCheck, CheckCircle2, DollarSign, Wallet, Clock, FileText } from 'lucide-react'

interface Financials {
  totalDebit: number
  totalKredit: number
}

function formatRp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function MainStatsCards({
  totalSekolah,
  totalLunas,
  totalPeserta,
  totalPendamping,
  totalPanitia,
  financials,
}: {
  totalSekolah: number
  totalLunas: number
  totalPeserta: number
  totalPendamping: number
  totalPanitia: number
  financials: Financials
}) {
  const cards = [
    {
      label: 'Total Sekolah',
      value: totalSekolah,
      subValue: `${totalLunas} Lunas`,
      icon: School,
      variant: 'blue' as const,
    },
    {
      label: 'Total Peserta',
      value: totalPeserta,
      icon: Users,
      variant: 'default' as const,
    },
    {
      label: 'Total Pendamping',
      value: totalPendamping,
      icon: UserCheck,
      variant: 'default' as const,
    },
    {
      label: 'Total Panitia',
      value: totalPanitia,
      icon: FileText,
      variant: 'default' as const,
    },
    {
      label: 'Pemasukan (Debit)',
      value: formatRp(financials.totalDebit),
      icon: DollarSign,
      variant: 'default' as const,
    },
    {
      label: 'Pengeluaran (Kredit)',
      value: formatRp(financials.totalKredit),
      icon: Wallet,
      variant: 'default' as const,
    },
    {
      label: 'Menunggu Konfirmasi',
      value: totalSekolah - totalLunas,
      icon: Clock,
      variant: 'warning' as const,
    },
    {
      label: 'Sekolah Terkonfirmasi',
      value: totalLunas,
      icon: CheckCircle2,
      variant: 'success' as const,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <Card key={i} className="p-4 sm:p-5 flex flex-col gap-2 bg-white border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 text-gray-500">
            <card.icon size={18} className="text-event-navy/70" />
            <span className="font-body text-xs text-gray-500 font-medium">{card.label}</span>
          </div>
          <div className="flex items-end justify-between gap-2 mt-1">
            <span className="font-body text-2xl font-bold text-event-navy">{card.value}</span>
            {card.subValue && <span className="font-body text-xs text-green-600">{card.subValue}</span>}
          </div>
        </Card>
      ))}
    </div>
  )
}