import { cn } from '@/lib/utils'

interface RadioPixelOption {
  value: string
  label: string
}

interface RadioPixelProps {
  label?: string
  name: string
  options: readonly RadioPixelOption[]
  value?: string
  onChange: (value: string) => void
  error?: string
}

export function RadioPixel({ label, name, options, value, onChange, error }: RadioPixelProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <p className="font-body font-bold text-sm text-event-navy">{label}</p>}
      <div className="flex gap-3 flex-wrap">
        {options.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'font-body font-bold text-sm px-5 py-3 border-3 border-event-navy transition-all duration-100',
                isActive
                  ? 'bg-event-blue text-white shadow-pixel-blue'
                  : 'bg-white text-event-navy hover:bg-event-cream'
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs font-bold text-pmi-red">{error}</p>}
    </div>
  )
}