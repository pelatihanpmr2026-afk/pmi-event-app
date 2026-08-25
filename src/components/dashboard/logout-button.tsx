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
        'flex items-center justify-center gap-2 font-body font-medium text-sm text-gray-500 px-3 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border)] hover:bg-red-50 hover:text-pmi-red hover:border-red-200 transition-colors',
        className
      )}
    >
      <LogOut size={16} />
      Keluar
    </button>
  )
}