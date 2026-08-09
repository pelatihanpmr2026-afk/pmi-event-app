'use client'

import { useEffect, useRef, useState } from 'react'

export function StatCounter({
  value,
  label,
  suffix = '',
}: {
  value: number
  label: string
  suffix?: string
}) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const duration = 1200
          const start = performance.now()

          function tick(now: number) {
            const progress = Math.min((now - start) / duration, 1)
            // steps() feel — angka naik "patah-patah" seperti mesin arcade
            const stepped = Math.floor(progress * 12) / 12
            setDisplay(Math.floor(stepped * value))
            if (progress < 1) requestAnimationFrame(tick)
            else setDisplay(value)
          }

          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 text-center">
      <span className="font-heading text-xl sm:text-3xl text-event-navy tabular-nums">
        {display}
        {suffix}
      </span>
      <span className="font-body text-[10px] sm:text-xs text-event-navy/60">{label}</span>
    </div>
  )
}