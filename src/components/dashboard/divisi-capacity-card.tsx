import { Card } from '@/components/ui/card'
import { DIVISI_OPTIONS } from '@/lib/constants'

interface DivisiCount {
  divisi: string
  count: number
}

export function DivisiCapacityCard({
  counts,
  capacityMap,
}: {
  counts: DivisiCount[]
  capacityMap: Record<string, number>
}) {
  const countMap = Object.fromEntries(counts.map((c) => [c.divisi, c.count]))

  return (
    <Card>
      <div className="px-5 py-3 bg-event-pink border-b-3 border-event-navy">
        <h2 className="font-heading text-xs text-white">KUOTA PER DIVISI</h2>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DIVISI_OPTIONS.map((opt) => {
          const terisi = countMap[opt.value] ?? 0
          const max = capacityMap[opt.value] ?? 0
          const persentase = max > 0 ? Math.min((terisi / max) * 100, 100) : 0
          const penuh = terisi >= max

          return (
            <div key={opt.value} className="border-2 border-event-navy/20 p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-body font-bold text-xs text-event-navy truncate">
                  {opt.label}
                </span>
                <span
                  className={`font-body text-xs font-bold shrink-0 ml-2 ${
                    penuh ? 'text-pmi-red' : 'text-event-navy/70'
                  }`}
                >
                  {terisi}/{max}
                </span>
              </div>
              <div className="h-2 bg-event-navy/10 border border-event-navy/20">
                <div
                  className={`h-full ${penuh ? 'bg-event-pink' : 'bg-event-blue'}`}
                  style={{ width: `${persentase}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}