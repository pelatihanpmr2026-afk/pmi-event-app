'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className={cn(
        'flex items-center justify-center gap-1.5 font-body font-bold text-xs bg-event-yellow text-white px-3 py-2 border-2 border-white/30 hover:border-event-pink hover:text-event-pink transition-colors',
        className
      )}
    >
      <LogOut size={14} />
      Keluar
    </button>
  )
}