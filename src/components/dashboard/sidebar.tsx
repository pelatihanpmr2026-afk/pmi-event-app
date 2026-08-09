'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion } from "motion/react";
import { cn } from '@/lib/utils'
import { DASHBOARD_NAV_ITEMS } from './nav-items'
import { LogoutButton } from './logout-button'

export function Sidebar({ adminNama }: { adminNama: string }) {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-event-blue border-r-4 border-event-navy shadow-pixel-xl"
    >
      <div className="flex items-center gap-3 px-5 py-5 border-b-3 border-white/10">
        <div className="relative w-10 h-10 shrink-0 bg-white p-1.5 border-2 border-event-yellow">
          <Image src="/assets/LogoEvent.png" alt="Logo PMI" fill className="object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-[10px] text-white leading-tight tracking-wider">PELATIHAN &amp; PELANTIKAN PMR</p>
          <p className="font-body text-xs text-white/60 leading-tight mt-1">Dashboard 2026</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1.5 px-3 py-5 overflow-y-auto">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <motion.div
              key={item.href}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 font-body font-bold text-sm border-2 transition-all duration-150',
                  isActive
                    ? 'bg-event-yellow text-event-navy border-event-navy shadow-pixel-sm'
                    : 'bg-transparent text-white/70 border-transparent hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t-3 border-white/10 flex flex-col gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 shrink-0 bg-event-blue border-2 border-white/30 flex items-center justify-center font-heading text-xs text-white">
            {adminNama.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-body font-bold text-sm text-white truncate">{adminNama}</p>
            <p className="font-body text-xs text-white/50">Administrator</p>
          </div>
        </div>
        <LogoutButton className="w-full" />
      </div>
    </motion.aside>
  )
}