import Image from 'next/image'
import Link from 'next/link'
import { LogoutButton } from './logout-button'

export function MobileTopbar() {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-[var(--color-border)]">
      <div className="px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-8 h-8 shrink-0">
            <Image src="/assets/LogoEvent.png" alt="Logo PMI" fill className="object-contain" />
          </div>
          <span className="font-heading text-[7px] text-event-navy leading-tight truncate">
            DASHBOARD PMR 2026
          </span>
        </Link>
        <LogoutButton className="!px-2.5 !py-2 [&>span]:hidden" />
      </div>
    </header>
  )
}