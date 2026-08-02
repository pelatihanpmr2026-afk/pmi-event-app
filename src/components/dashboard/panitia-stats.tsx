import { Card } from '@/components/ui/card'
import { Users, Building2 } from 'lucide-react'

interface PanitiaStatsProps {
  total: number
  perUnit: Record<string, number>
}

const UNIT_LABELS: Record<string, string> = {
  KSR_MARKAS: 'KSR Markas',
  KSR_UNSUR: 'KSR Univ. UNSUR',
  KSR_UNPI: 'KSR Univ. UNPI',
}

export function PanitiaStats({ total, perUnit }: PanitiaStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card className="p-4 sm:p-5 flex flex-col gap-3 bg-event-pink text-white transition-transform duration-150 hover:-translate-y-1 hover:shadow-pixel-lg cursor-default">
        <div className="w-10 h-10 bg-white/20 border-2 border-white/40 flex items-center justify-center">
          <Users size={20} />
        </div>
        <div>
          <span className="font-heading text-xl sm:text-2xl block">{total}</span>
          <span className="font-body text-xs">Total Panitia</span>
        </div>
      </Card>
      {Object.entries(UNIT_LABELS).map(([key, label]) => (
        <Card
          key={key}
          className="p-4 sm:p-5 flex flex-col gap-3 transition-transform duration-150 hover:-translate-y-1 hover:shadow-pixel-lg cursor-default"
        >
          <div className="w-10 h-10 bg-event-navy/10 border-2 border-event-navy/20 flex items-center justify-center">
            <Building2 size={20} className="text-event-navy" />
          </div>
          <div>
            <span className="font-heading text-xl sm:text-2xl text-event-navy block">
              {perUnit[key] ?? 0}
            </span>
            <span className="font-body text-xs text-event-navy/70">{label}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}