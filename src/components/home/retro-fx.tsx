'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

/**
 * Ultra-subtle CRT scanline texture, fixed over the whole viewport.
 * Pure CSS gradient, no image asset, near-invisible but adds tactile depth.
 */
export function ScanlineOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] opacity-[0.05] mix-blend-multiply"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, rgba(10,15,30,0.9) 0px, rgba(10,15,30,0.9) 1px, transparent 1px, transparent 3px)',
      }}
    />
  )
}

/** Thin pixel-styled progress bar tracking scroll position through the page. */
export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      setProgress(max > 0 ? (el.scrollTop / max) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[70] h-[3px] bg-event-navy/10"
    >
      <div
        className="h-full bg-event-pink transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

/** Small pixel-bordered "back to top" button that appears after scrolling past the hero. */
export function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!show) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Kembali ke atas"
      className="fixed bottom-5 right-5 z-[70] w-11 h-11 bg-event-navy text-white border-3 border-event-navy shadow-pixel flex items-center justify-center hover:bg-event-pink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
    >
      <ArrowUp size={18} />
    </button>
  )
}