'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Wraps hero visuals with a subtle mouse-follow tilt/parallax.
 * Disabled entirely when the user prefers reduced motion.
 */
export function HeroParallax({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('translate3d(0,0,0) rotate(0deg)')

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const node = ref.current
    if (!node) return

    const handleMove = (e: MouseEvent) => {
      const rect = node.getBoundingClientRect()
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height
      setTransform(`translate3d(${x * -10}px, ${y * -10}px, 0) rotate(${x * 0.6}deg)`)
    }
    const handleLeave = () => setTransform('translate3d(0,0,0) rotate(0deg)')

    window.addEventListener('mousemove', handleMove)
    node.addEventListener('mouseleave', handleLeave)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      node.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: 'transform 200ms ease-out', transform }}
    >
      {children}
    </div>
  )
}