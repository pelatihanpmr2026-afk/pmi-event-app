import Image from 'next/image'
import Link from 'next/link'
import { LogoutButton } from './logout-button'

export function MobileTopbar() {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-event-navy border-b-5 border-event-pink">
      <div className="px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="relative w-8 h-8 shrink-0 bg-white p-1">
            <Image src="/assets/logo-pmi.png" alt="Logo PMI" fill className="object-contain" />
          </div>
          <span className="font-heading text-[9px] text-white leading-tight truncate">
            DASHBOARD
          </span>
        </Link>
        <LogoutButton />
      </div>
    </header>
  )
}