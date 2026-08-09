/**
 * HudStrip — small decorative "system status" readout used above the hero
 * and inside dark sections. Pure presentation, no external deps, so it can
 * drop into the existing `@/components/home/` folder without touching
 * anything else in the project.
 */
export function HudStrip({
  index,
  total,
  location = 'CIANJUR, INDONESIA',
  tone = 'light',
}: {
  index: number
  total: number
  location?: string
  tone?: 'light' | 'dark'
}) {
  const dim = tone === 'dark' ? 'text-white/40' : 'text-event-navy/40'
  const strong = tone === 'dark' ? 'text-white/70' : 'text-event-navy/70'

  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-between gap-3 font-heading text-[8px] sm:text-[9px] tracking-widest ${dim}`}
    >
      <span className={strong}>
        {String(index).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
      <span className="hidden sm:inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 bg-event-pink animate-blink" />
        PMI KABUPATEN CIANJUR
      </span>
      <span>{location}</span>
    </div>
  )
}