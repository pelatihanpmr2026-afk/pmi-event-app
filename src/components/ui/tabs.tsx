'use client'

import { cn } from '@/lib/utils'

interface TabItem {
  key: string
  label: string
  badge?: number
}

export function Tabs({
  tabs,
  activeKey,
  onChange,
  pixel,
}: {
  tabs: TabItem[]
  activeKey: string
  onChange: (key: string) => void
  pixel?: boolean
}) {
  return (
    <div className={cn(
      'flex gap-1 p-1 rounded-[var(--radius-btn)] w-fit max-w-full overflow-x-auto',
      pixel ? 'bg-white border-3 border-event-navy shadow-pixel' : 'bg-[var(--color-surface-muted)]'
    )}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-[calc(var(--radius-btn)-2px)] font-body font-medium text-sm whitespace-nowrap transition-all duration-150',
              isActive
                ? pixel
                  ? 'bg-event-blue text-white shadow-pixel-sm'
                  : 'bg-white text-event-navy shadow-[var(--shadow-soft)]'
                : 'text-gray-500 hover:text-event-navy'
            )}
          >
            {tab.label}
            {typeof tab.badge === 'number' && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold',
                  isActive ? 'bg-event-blue text-white' : 'bg-gray-200 text-gray-600'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}