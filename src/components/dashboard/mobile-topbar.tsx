'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from "motion/react";
import { LogoutButton } from './logout-button'

export function MobileTopbar() {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="lg:hidden sticky top-0 z-40 bg-event-navy border-b-4 border-event-pink shadow-pixel"
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="relative w-9 h-9 shrink-0 bg-white p-1.5 rounded-sm border-2 border-event-yellow">
            <Image src="/assets/LogoEvent.png" alt="Logo PMI" fill className="object-contain" />
          </div>
          <span className="font-heading text-[10px] text-white leading-tight tracking-wider truncate">
            DASHBOARD
          </span>
        </Link>
        <LogoutButton />
      </div>
    </motion.header>
  )
}