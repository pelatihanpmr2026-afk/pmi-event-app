'use client'

import Image from 'next/image'
import { PixelClouds } from '@/components/home/pixel-clouds'
import { PixelMarquee } from '@/components/home/pixel-marquee'
import { Reveal } from '@/components/home/scroll-reveal'
import { cn } from '@/lib/utils'

interface PixelPageShellProps {
  title: string
  subtitle: string
  marqueeItems: string[]
  marqueeVariant?: 'pink' | 'blue' | 'yellow'
  children: React.ReactNode
  contentClassName?: string
}

export function PixelPageShell({
  title,
  subtitle,
  marqueeItems,
  marqueeVariant = 'pink',
  children,
  contentClassName = 'max-w-2xl',
}: PixelPageShellProps) {
  return (
    <>
      <PixelClouds />
      <main className="relative min-h-screen pb-16">
        {/* ===== HERO HEADER ===== */}
        <section className="relative overflow-hidden px-4 sm:px-6 pt-10 sm:pt-14 pb-10">
          <div className="relative max-w-5xl mx-auto flex flex-col items-center gap-4 sm:gap-5 text-center">
            <Reveal y={12}>
              <div className="inline-flex items-center gap-2 bg-white border-2 border-event-navy shadow-pixel-sm px-4 py-2">
                <span className="w-2 h-2 bg-event-pink" aria-hidden="true" />
                <span className="font-heading text-[9px] text-event-navy">PMI KABUPATEN CIANJUR</span>
                <span className="w-2 h-2 bg-event-yellow" aria-hidden="true" />
              </div>
            </Reveal>

            <Reveal delay={70} y={16}>
              <div className="relative float-slow w-full max-w-[200px] sm:max-w-[260px]">
                <div className="absolute -inset-2 sm:-inset-3 border-2 border-event-navy/20" aria-hidden="true" />
                <div className="relative bg-white border-3 border-event-navy shadow-pixel-lg px-3 py-2 sm:px-4 sm:py-3 -rotate-1">
                  <div className="flex items-center justify-between mb-1.5 px-0.5" aria-hidden="true">
                    <span className="w-2.5 h-2.5 bg-event-pink border border-event-navy" />
                    <span className="w-2.5 h-2.5 bg-event-yellow border border-event-navy" />
                    <span className="w-2.5 h-2.5 bg-event-blue border border-event-navy" />
                  </div>
                  <Image
                    src="/assets/LogoEvent.png"
                    alt="Logo Event"
                    width={842}
                    height={482}
                    className="w-full h-auto"
                    priority
                  />
                </div>
              </div>
            </Reveal>

            <Reveal delay={130}>
              <h1 className="font-heading gradient-text pixel-shadow-soft text-[clamp(1.15rem,1rem+3vw,2rem)] leading-relaxed sm:leading-relaxed">
                {title}
              </h1>
            </Reveal>

            <Reveal delay={190}>
              <p className="font-body text-xs sm:text-sm text-gray-500 max-w-md leading-relaxed">{subtitle}</p>
            </Reveal>
          </div>
        </section>

        <PixelMarquee items={marqueeItems} variant={marqueeVariant} />

        {/* ===== CONTENT ===== */}
        <div className={cn('px-4 sm:px-6 mt-8 sm:mt-10 mx-auto w-full flex flex-col gap-6', contentClassName)}>
          {children}
        </div>
      </main>
    </>
  )
}