import { cn } from '@/lib/utils'

interface RadioOption {
  value: string
  label: string
}

interface RadioPixelProps {
  label?: string
  name: string
  options: readonly RadioOption[]
  value?: string
  onChange: (value: string) => void
  error?: string
  pixel?: boolean
}

export function RadioPixel({ label, name, options, value, onChange, error, pixel }: RadioPixelProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <p className="font-body font-medium text-sm text-event-navy">{label}</p>}
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'h-11 font-body font-medium text-sm rounded-[var(--radius-input)] border transition-all duration-150',
                pixel
                  ? isActive
                    ? 'bg-event-blue text-white border-3 border-event-navy shadow-pixel-sm -translate-x-0.5 -translate-y-0.5'
                    : 'bg-white text-event-navy border-3 border-event-navy/40 hover:border-event-navy'
                  : isActive
                    ? 'bg-event-blue text-white border-event-blue shadow-[var(--shadow-soft)]'
                    : 'bg-white text-event-navy border-[var(--color-border)] hover:border-event-blue/50'
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs font-medium text-pmi-red">{error}</p>}
    </div>
  )
}