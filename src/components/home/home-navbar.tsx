'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ArrowRight } from 'lucide-react'

const NAV_LINKS = [
  { href: '#tentang', label: 'Tentang' },
  { href: '#daftar', label: 'Pendaftaran' },
  { href: '#timeline', label: 'Timeline' },
  { href: '#faq', label: 'FAQ' },
]

export function HomeNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeHash, setActiveHash] = useState<string>('')
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  // Solid/glass header transition
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Track which section is in view so the active nav item can highlight itself
  useEffect(() => {
    const sections = NAV_LINKS.map((l) => document.querySelector(l.href)).filter(
      (el): el is Element => el !== null
    )
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveHash(`#${visible.target.id}`)
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] }
    )
    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Lock background scroll + support Escape while mobile menu is open
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    menuBtnRef.current?.focus()
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b-3 border-event-navy shadow-pixel-sm'
          : 'bg-transparent border-b-3 border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center shrink-0 group">
          <div className="relative w-28 h-auto sm:w-36 sm:h-20 transition-transform duration-200 group-hover:scale-[1.03]">
            <Image src="/assets/LogoPMI.jpg" alt="Logo PMI" fill className="object-contain" priority />
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Navigasi utama">
          {NAV_LINKS.map((link) => {
            const active = activeHash === link.href
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={active ? 'true' : undefined}
                className={`relative font-body font-bold text-xs px-3 py-2 border-2 transition-colors ${
                  active
                    ? 'text-event-navy border-event-navy bg-event-yellow'
                    : 'text-event-navy border-transparent hover:border-event-navy hover:bg-event-yellow/60'
                }`}
              >
                {link.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-event-pink"
                  />
                )}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/sekolah/daftar" className="hidden sm:block group">
            <div className="font-body font-bold text-xs bg-event-pink text-white border-3 border-event-navy shadow-pixel-sm px-4 py-2.5 hover:bg-event-pink-dark active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all inline-flex items-center gap-1.5">
              Daftar Sekarang
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          <button
            ref={menuBtnRef}
            onClick={() => setIsOpen(true)}
            aria-label="Buka menu navigasi"
            aria-expanded={isOpen}
            aria-controls="mobile-nav-panel"
            className="md:hidden w-10 h-10 flex items-center justify-center bg-event-navy text-white border-3 border-event-navy active:translate-x-[2px] active:translate-y-[2px] transition-transform"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Full-screen mobile menu */}
      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className={`md:hidden fixed inset-0 z-[60] bg-event-navy transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* pixel grid backdrop, decorative only */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative h-full flex flex-col">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="relative w-28 h-20">
              <Image src="/assets/LogoPMI.jpg" alt="Logo PMI" fill className="object-contain" />
            </div>
            <button
              ref={closeBtnRef}
              onClick={closeMenu}
              aria-label="Tutup menu navigasi"
              className="w-10 h-10 flex items-center justify-center bg-white text-event-navy border-3 border-white active:translate-x-[2px] active:translate-y-[2px] transition-transform"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 flex flex-col justify-center px-6 gap-2" aria-label="Navigasi mobile">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                style={{ transitionDelay: isOpen ? `${i * 60 + 60}ms` : '0ms' }}
                className={`font-heading text-lg text-white px-2 py-3 border-b-2 border-white/10 hover:text-event-yellow transition-all duration-300 ${
                  isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                }`}
              >
                {String(i + 1).padStart(2, '0')} — {link.label.toUpperCase()}
              </a>
            ))}

            <Link
              href="/sekolah/daftar"
              onClick={closeMenu}
              style={{ transitionDelay: isOpen ? `${NAV_LINKS.length * 60 + 60}ms` : '0ms' }}
              className={`mt-6 transition-all duration-300 ${
                isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
              }`}
            >
              <div className="font-heading text-[11px] bg-event-pink text-white border-3 border-white px-6 py-4 text-center inline-flex items-center justify-center gap-2 w-full">
                DAFTAR SEKARANG
                <ArrowRight size={14} />
              </div>
            </Link>
          </nav>

          <p className="px-6 pb-6 font-heading text-[8px] text-white/30 tracking-widest">
            PMR EVENT NETWORK &middot; CIANJUR, INDONESIA
          </p>
        </div>
      </div>
    </header>
  )
}