'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { DASHBOARD_NAV_ITEMS } from './nav-items'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
    >
      <div className="relative flex items-stretch justify-between gap-0.5 px-1.5 py-2.5 bg-event-navy/90 backdrop-blur-md border-t-2 border-event-navy/50 shadow-pixel-lg overflow-hidden">
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />

        {DASHBOARD_NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <motion.div
              key={item.href}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 min-w-0"
            >
              <Link
                href={item.href}
                className={cn(
                  'group relative flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-lg border-[1.5px] transition-all duration-200',
                  isActive
                    ? 'bg-event-yellow/10 border-event-yellow shadow-[0_0_10px_rgba(253,194,15,0.2)]'
                    : 'border-transparent hover:border-white/20 hover:bg-white/5'
                )}
              >
                {/* Pixel corner accents (only when active) */}
                {isActive && (
                  <>
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l-[1.5px] border-t-[1.5px] border-event-yellow" />
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-r-[1.5px] border-t-[1.5px] border-event-yellow" />
                    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-l-[1.5px] border-b-[1.5px] border-event-yellow" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r-[1.5px] border-b-[1.5px] border-event-yellow" />
                  </>
                )}

                <Icon
                  size={20}
                  className={cn(
                    'transition-colors duration-200',
                    isActive ? 'text-event-yellow' : 'text-white/60 group-hover:text-white'
                  )}
                />
                <span
                  className={cn(
                    'w-full text-center font-body font-bold text-[8px] tracking-wider leading-tight transition-colors duration-200',
                    isActive ? 'text-event-yellow' : 'text-white/50 group-hover:text-white/80'
                  )}
                >
                  {item.label}
                </span>

                {/* Animated active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-event-yellow rounded-sm"
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  />
                )}
              </Link>
            </motion.div>
          )
        })}
      </div>
    </motion.nav>
  )
}