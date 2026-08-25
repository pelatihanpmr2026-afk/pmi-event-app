'use client'

import { useSyncExternalStore } from 'react'

const BLOBS = [
  { size: 340, top: '-12%', left: '-18%', bg: 'rgba(24,152,213,0.5)', delay: '0s' },
  { size: 300, top: '2%', left: '58%', bg: 'rgba(236,62,150,0.35)', delay: '-6s' },
  { size: 320, top: '42%', left: '72%', bg: 'rgba(54,83,165,0.42)', delay: '-12s' },
  { size: 240, top: '58%', left: '-10%', bg: 'rgba(253,194,15,0.35)', delay: '-4s' },
]

function PixelCross({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden="true">
      <g fill={color}>
        <rect x="3" y="0" width="2" height="8" />
        <rect x="0" y="3" width="8" height="2" />
      </g>
    </svg>
  )
}

function PixelSquare({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 6 6" aria-hidden="true">
      <rect x="1" y="1" width="4" height="4" fill={color} />
      <rect x="2" y="2" width="2" height="2" fill="#FFF8E7" />
    </svg>
  )
}

const SHAPES = [
  { top: '14%', left: '8%', size: 34, color: 'var(--color-event-pink)', rot: '-8deg', delay: '0s', Comp: PixelCross },
  { top: '22%', left: '84%', size: 28, color: 'var(--color-event-blue)', rot: '10deg', delay: '1.2s', Comp: PixelCross },
  { top: '60%', left: '12%', size: 26, color: 'var(--color-event-yellow)', rot: '0deg', delay: '0.6s', Comp: PixelSquare },
  { top: '68%', left: '80%', size: 32, color: 'var(--color-event-navy)', rot: '-6deg', delay: '1.8s', Comp: PixelCross },
]

const SPARKLES = [
  { top: '8%', left: '38%', size: 10, color: 'var(--color-event-yellow)', delay: '0s' },
  { top: '30%', left: '24%', size: 8, color: 'var(--color-event-pink)', delay: '0.9s' },
  { top: '50%', left: '88%', size: 9, color: 'var(--color-event-blue)', delay: '1.4s' },
  { top: '78%', left: '30%', size: 8, color: 'var(--color-event-yellow)', delay: '0.4s' },
]

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getReducedMotion() {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function HeroAurora() {
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => true)

  const animStyle = (delay: string) => (reduced ? undefined : { animationDelay: delay })

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/20 to-transparent" />
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="aurora-blob"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: `radial-gradient(circle at 35% 35%, ${b.bg}, transparent 70%)`,
            animationDelay: b.delay,
          }}
        />
      ))}
      {SHAPES.map((s, i) => (
        <div
          key={i}
          className="hero-shape"
          style={{ top: s.top, left: s.left, ['--float-rot' as string]: s.rot, ...animStyle(s.delay) }}
        >
          <s.Comp size={s.size} color={s.color} />
        </div>
      ))}
      {SPARKLES.map((s, i) => (
        <div
          key={i}
          className="sparkle-dot"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            background: s.color,
            ...animStyle(s.delay),
          }}
        />
      ))}
    </div>
  )
}