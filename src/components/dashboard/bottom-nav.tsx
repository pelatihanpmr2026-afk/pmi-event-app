'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getNavItemsForRole } from './nav-items'
import type { AdminRoleType } from '@/lib/admin-role'

export function BottomNav({ role }: { role: AdminRoleType }) {
  const pathname = usePathname()
  const navItems = getNavItemsForRole(role)

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--color-border)] shadow-[0_-4px_16px_rgba(16,24,40,0.06)] flex items-stretch overflow-x-auto">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 min-w-[68px] flex flex-col items-center justify-center gap-1 py-2.5 font-body font-medium text-[10px] transition-colors',
              isActive ? 'text-event-blue' : 'text-gray-400'
            )}
          >
            <div className={cn('p-1 rounded-full', isActive && 'bg-event-blue/10')}>
              <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
            </div>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}