'use client'

interface TimelineItem {
  label: string
  title: string
  description: string
  status: 'done' | 'active' | 'upcoming'
}

export function PixelTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const dotStyle = {
          done: 'bg-event-yellow border-event-navy',
          active: 'bg-event-pink border-event-navy animate-bounce-pixel',
          upcoming: 'bg-white border-event-navy/30',
        }[item.status]

        return (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-5 h-5 border-3 ${dotStyle}`} />
              {!isLast && (
                <div
                  className={`w-1 flex-1 min-h-[52px] ${
                    item.status === 'done' ? 'bg-event-yellow' : 'bg-event-navy/15'
                  }`}
                />
              )}
            </div>
            <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
              <span className="font-heading text-[9px] text-event-pink block mb-1">{item.label}</span>
              <h4 className="font-body font-bold text-sm text-event-navy">{item.title}</h4>
              <p className="font-body text-xs text-event-navy/60 mt-0.5">{item.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}