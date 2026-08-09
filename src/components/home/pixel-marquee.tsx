'use client'

export function PixelMarquee({
  items,
  variant = 'pink',
}: {
  items: string[]
  variant?: 'pink' | 'blue' | 'yellow'
}) {
  const bg = {
    pink: 'bg-event-pink text-white',
    blue: 'bg-event-blue text-white',
    yellow: 'bg-event-yellow text-event-navy',
  }[variant]

  const doubled = [...items, ...items]

  return (
    <div className={`${bg} border-y-3 border-event-navy overflow-hidden py-2.5`}>
      <div className="flex whitespace-nowrap animate-marquee">
        {doubled.map((item, i) => (
          <span key={i} className="font-heading text-[10px] sm:text-xs mx-6 inline-flex items-center gap-6">
            {item}
            <span className="text-current opacity-50">◆</span>
          </span>
        ))}
      </div>
    </div>
  )
}