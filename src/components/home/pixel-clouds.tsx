'use client'

const CLOUDS = [
  { top: '8%', left: '5%', size: 60, delay: '0s', color: 'var(--color-event-blue)', opacity: 0.15 },
  { top: '18%', left: '78%', size: 45, delay: '0.8s', color: 'var(--color-event-pink)', opacity: 0.12 },
  { top: '42%', left: '12%', size: 38, delay: '1.4s', color: 'var(--color-event-yellow)', opacity: 0.18 },
  { top: '60%', left: '85%', size: 52, delay: '0.4s', color: 'var(--color-event-blue)', opacity: 0.1 },
  { top: '75%', left: '8%', size: 42, delay: '1.8s', color: 'var(--color-event-pink)', opacity: 0.14 },
  { top: '30%', left: '45%', size: 30, delay: '2.2s', color: 'var(--color-event-yellow)', opacity: 0.1 },
]

function PixelCloudShape({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  const u = size / 8
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 8 5" style={{ opacity }}>
      <g fill={color}>
        <rect x="2" y="1" width="4" height="1" />
        <rect x="1" y="2" width="6" height="1" />
        <rect x="0" y="3" width="8" height="1" />
        <rect x="1" y="4" width="6" height="1" />
      </g>
    </svg>
  )
}

export function PixelClouds() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
      {CLOUDS.map((cloud, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            top: cloud.top,
            left: cloud.left,
            animationDelay: cloud.delay,
          }}
        >
          <PixelCloudShape size={cloud.size} color={cloud.color} opacity={cloud.opacity} />
        </div>
      ))}
    </div>
  )
}