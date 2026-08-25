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
      <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-blue text-white">
        <div className="flex items-center gap-2">
          <Users size={18} />
          <span className="font-body text-xs font-medium">Total Panitia</span>
        </div>
        <span className="font-body text-2xl font-bold">{total}</span>
      </Card>

      {Object.entries(UNIT_LABELS).map(([key, label]) => (
        <Card key={key} className="p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-event-navy">
            <Building2 size={18} className="text-gray-400" />
            <span className="font-body text-xs text-gray-500">{label}</span>
          </div>
          <span className="font-body text-2xl font-bold text-event-navy">{perUnit[key] ?? 0}</span>
        </Card>
      ))}
    </div>
  )
}