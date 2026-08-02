'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DASHBOARD_NAV_ITEMS } from './nav-items'
import { LogoutButton } from './logout-button'

export function Sidebar({ adminNama }: { adminNama: string }) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-event-blue border-r-5 border-event-navy">
      <div className="flex items-center gap-3 px-5 py-5 border-b-3 border-white/10">
        <div className="relative w-9 h-9 shrink-0 bg-white p-1">
          <Image src="/assets/LogoEvent.png" alt="Logo PMI" fill className="object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-[9px] text-white leading-tight">PELATIHAN & PELANTIKAN PMR</p>
          <p className="font-body text-[10px] text-white/60 leading-tight mt-1">Dashboard 2026</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1.5 px-3 py-5 overflow-y-auto">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 font-body font-bold text-xs border-2 transition-all duration-150',
                isActive
                  ? 'bg-event-yellow text-event-navy border-event-navy shadow-pixel-sm'
                  : 'bg-transparent text-white/70 border-transparent hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t-3 border-white/10 flex flex-col gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 shrink-0 bg-event-blue border-2 border-white/30 flex items-center justify-center font-heading text-[10px] text-white">
            {adminNama.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-body font-bold text-xs text-white truncate">{adminNama}</p>
            <p className="font-body text-[10px] text-white/50">Administrator</p>
          </div>
        </div>
        <LogoutButton className="w-full" />
      </div>
    </aside>
  )
}