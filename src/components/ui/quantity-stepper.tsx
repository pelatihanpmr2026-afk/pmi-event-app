'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function QuantityStepper({
  value,
  onChange,
  max,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  max: number
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value <= 0}
        className={cn(
          'w-8 h-8 flex items-center justify-center border-2 border-event-navy font-bold transition-colors',
          value <= 0 || disabled
            ? 'bg-event-navy/10 text-event-navy/30'
            : 'bg-white text-event-navy hover:bg-event-cream'
        )}
      >
        <Minus size={14} />
      </button>
      <span className="font-body font-bold text-sm text-event-navy w-6 text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className={cn(
          'w-8 h-8 flex items-center justify-center border-2 border-event-navy font-bold transition-colors',
          value >= max || disabled
            ? 'bg-event-navy/10 text-event-navy/30'
            : 'bg-event-blue text-white hover:bg-event-blue-dark'
        )}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}