'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  as?: 'div' | 'li'
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  y = 24,
  as = 'div',
}: RevealProps) {
  const ref = useRef<HTMLDivElement | HTMLLIElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current

    if (!node) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    // Don't animate when reduced motion is enabled.
    // CSS will make the element visible immediately.
    if (prefersReducedMotion) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(entry.target)
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  const Comp = as

  const style: CSSProperties = {
    transitionProperty: 'opacity, transform',
    transitionDuration: '700ms',
    transitionTimingFunction:
      'cubic-bezier(0.16, 1, 0.3, 1)',
    transitionDelay: `${delay}ms`,
    opacity: visible ? 1 : 0,
    transform: visible
      ? 'translateY(0px)'
      : `translateY(${y}px)`,
    willChange: 'opacity, transform',
  }

  return (
    <Comp
      ref={ref as never}
      className={`reveal ${className}`}
      style={style}
    >
      {children}
    </Comp>
  )
}
