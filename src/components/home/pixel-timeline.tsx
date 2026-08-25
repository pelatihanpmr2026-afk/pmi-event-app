'use client'

interface TimelineItem {
  label: string
  title: string
  description: string
  status: 'done' | 'active' | 'upcoming'
}

const STATUS_STYLE: Record<TimelineItem['status'], { number: string; line: string; card: string; badge: string }> = {
  done: {
    number: 'bg-event-yellow text-event-navy',
    line: 'bg-event-yellow',
    card: 'border-event-navy',
    badge: 'bg-event-yellow/20 text-event-navy',
  },
  active: {
    number: 'bg-event-pink text-white',
    line: 'bg-event-pink/40',
    card: 'border-event-pink',
    badge: 'bg-event-pink/10 text-event-pink',
  },
  upcoming: {
    number: 'bg-white text-event-navy/50',
    line: 'bg-event-navy/15',
    card: 'border-event-navy/25',
    badge: 'bg-event-navy/5 text-event-navy/50',
  },
}

export function PixelTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const status = STATUS_STYLE[item.status]

        return (
          <div key={i} className="flex gap-4 sm:gap-5">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-9 h-9 sm:w-11 sm:h-11 border-2 border-event-navy flex items-center justify-center font-heading text-xs sm:text-sm shadow-pixel-sm ${status.number}`}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              {!isLast && <div className={`w-1.5 flex-1 min-h-[52px] ${status.line}`} />}
            </div>
            <div
              className={`flex-1 mb-5 border-2 bg-white px-4 py-3.5 sm:px-5 sm:py-4 border-l-4 ${status.card} shadow-[var(--shadow-soft)]`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`font-heading text-[8px] px-2 py-0.5 border border-current ${status.badge}`}
                >
                  {item.label}
                </span>
                {item.status === 'active' && (
                  <span className="font-heading text-[8px] text-event-pink animate-blink">● LIVE</span>
                )}
              </div>
              <h4 className="font-body font-bold text-sm sm:text-base text-event-navy">{item.title}</h4>
              <p className="font-body text-xs text-event-navy/60 mt-0.5 leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}