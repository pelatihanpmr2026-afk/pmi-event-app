'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getNavItemsForRole } from './nav-items'
import { LogoutButton } from './logout-button'
import type { AdminRoleType } from '@/lib/admin-role'

export function Sidebar({ adminNama, role }: { adminNama: string; role: AdminRoleType }) {
  const pathname = usePathname()
  const navItems = getNavItemsForRole(role)

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-[var(--color-border)]">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--color-border)]">
        <div className="relative w-9 h-9 shrink-0">
          <Image src="/assets/LogoEvent.png" alt="Logo PMI" fill className="object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-[8px] text-event-navy leading-tight">DASHBOARD</p>
          <p className="font-body text-[11px] text-gray-400 leading-tight mt-1">Pelantikan PMR 2026</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-input)] font-body font-medium text-sm transition-all duration-150',
                isActive
                  ? 'bg-event-blue/10 text-event-blue-dark font-semibold'
                  : 'text-gray-500 hover:bg-[var(--color-surface-muted)] hover:text-event-navy'
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[var(--color-border)] flex flex-col gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-full bg-event-blue flex items-center justify-center font-body font-semibold text-sm text-white">
            {adminNama.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-body font-medium text-sm text-event-navy truncate">{adminNama}</p>
            <p className="font-body text-xs text-gray-400 capitalize">{role.toLowerCase()}</p>
          </div>
        </div>
        <LogoutButton className="w-full" />
      </div>
    </aside>
  )
}