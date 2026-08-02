import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="font-body font-bold text-sm text-event-navy">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'font-body appearance-none w-full px-4 py-3 bg-white border-3 border-event-navy text-event-navy',
              'focus:outline-none focus:shadow-pixel-sm focus:-translate-x-[1px] focus:-translate-y-[1px]',
              'transition-all duration-100 cursor-pointer',
              error && 'border-pmi-red',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
                {opt.disabled ? ' (Penuh)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" size={18} />
        </div>
        {error && <p className="text-xs font-bold text-pmi-red">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'