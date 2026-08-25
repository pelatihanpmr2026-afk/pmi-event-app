import type { ReactNode } from 'react'

type BadgeTone = 'pink' | 'blue' | 'yellow'

const BADGE_TONES: Record<BadgeTone, string> = {
  pink: 'bg-event-pink text-white',
  blue: 'bg-event-blue text-white',
  yellow: 'bg-event-yellow text-event-navy',
}

export function SectionHeader({
  badge,
  tone = 'pink',
  title,
  subtitle,
}: {
  badge: string
  tone?: BadgeTone
  title: ReactNode
  subtitle?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <div
        className={`inline-flex items-center gap-2 ${BADGE_TONES[tone]} border-2 border-event-navy shadow-pixel-sm px-4 py-1.5`}
      >
        <span className="w-2 h-2 bg-current opacity-60" aria-hidden="true" />
        <span className="font-heading text-[9px]">{badge}</span>
        <span className="w-2 h-2 bg-current opacity-60" aria-hidden="true" />
      </div>
      <h2 className="font-heading pixel-shadow-soft text-[clamp(1.1rem,1rem+2.5vw,2.1rem)] text-event-navy leading-relaxed">
        {title}
      </h2>
      {subtitle && (
        <p className="font-body text-xs sm:text-sm text-gray-500 max-w-xl leading-relaxed">{subtitle}</p>
      )}
    </div>
  )
}