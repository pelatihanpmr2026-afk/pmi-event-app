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
}: {
  tabs: TabItem[]
  activeKey: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex border-3 border-event-navy overflow-hidden">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 font-body font-bold text-xs transition-colors',
              isActive ? 'bg-event-blue text-white' : 'bg-white text-event-navy hover:bg-event-cream'
            )}
          >
            {tab.label}
            {typeof tab.badge === 'number' && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] border-2',
                  isActive
                    ? 'bg-white text-event-navy border-white'
                    : 'bg-event-navy/10 text-event-navy border-event-navy/20'
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