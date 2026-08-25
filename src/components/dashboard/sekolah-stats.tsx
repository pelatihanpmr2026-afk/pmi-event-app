import { Card } from '@/components/ui/card'
import { School, Users, Clock } from 'lucide-react'

export function SekolahStats({
  totalSekolah,
  totalPeserta,
  totalPendamping,
  menungguKonfirmasi,
}: {
  totalSekolah: number
  totalPeserta: number
  totalPendamping: number
  menungguKonfirmasi: number
}) {
  const cards = [
    { icon: School, label: 'Total Sekolah', value: totalSekolah, tint: 'text-event-blue bg-event-blue/10' },
    { icon: Users, label: 'Total Peserta', value: totalPeserta, tint: 'text-event-pink bg-event-pink/10' },
    { icon: Users, label: 'Total Pendamping', value: totalPendamping, tint: 'text-event-navy bg-event-navy/10' },
    { icon: Clock, label: 'Menunggu Konfirmasi', value: menungguKonfirmasi, tint: 'text-amber-600 bg-amber-50' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-4 sm:p-5 flex flex-col gap-3">
          <div className={`w-10 h-10 rounded-[var(--radius-input)] flex items-center justify-center ${c.tint}`}>
            <c.icon size={20} />
          </div>
          <div>
            <span className="font-body text-2xl font-bold text-event-navy block">{c.value}</span>
            <span className="font-body text-xs text-gray-400">{c.label}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}