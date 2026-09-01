'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { href: '#tentang', label: 'Tentang' },
  { href: '#daftar', label: 'Daftar' },
  { href: '#tenda', label: 'Sewa Tenda' },
  { href: '#timeline', label: 'Timeline' },
  { href: '#faq', label: 'FAQ' },
]

export function HomeNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white border-b-2 border-event-navy/15 shadow-[var(--shadow-soft)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center shrink-0">
          <div className="relative w-28 h-11 sm:w-36 sm:h-14">
            <Image src="/assets/LogoEvent.png" alt="Logo PMI" fill className="object-contain" priority />
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body font-medium text-sm text-gray-600 px-3 py-2 rounded-[var(--radius-btn)] hover:bg-[var(--color-surface-muted)] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/sekolah/daftar" className="hidden sm:block">
            <div className="font-body font-medium text-sm bg-event-pink text-white border border-[var(--color-border)] rounded-[var(--radius-btn)] px-4 py-2 shadow-[var(--shadow-soft)] hover:bg-event-pink-dark transition-colors">
              Daftar Sekarang
            </div>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-[var(--radius-btn)] text-gray-500 hover:bg-[var(--color-surface-muted)] transition-colors"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t border-[var(--color-border)] animate-pixel-pop">
          <nav className="flex flex-col p-3 gap-1.5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="font-body font-medium text-sm text-gray-600 px-4 py-3 rounded-[var(--radius-btn)] hover:bg-[var(--color-surface-muted)] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link href="/sekolah/daftar" onClick={() => setIsOpen(false)}>
              <div className="font-body font-medium text-sm bg-event-pink text-white border border-[var(--color-border)] rounded-[var(--radius-btn)] px-4 py-3 text-center transition-colors">
                Daftar Sekolah
              </div>
            </Link>
            <Link href="/tenda/sewa" onClick={() => setIsOpen(false)}>
              <div className="font-body font-medium text-sm bg-event-pink text-white border border-[var(--color-border)] rounded-[var(--radius-btn)] px-4 py-3 text-center transition-colors">
                Sewa tenda
              </div>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
