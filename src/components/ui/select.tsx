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
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="font-body font-medium text-sm text-event-navy">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'font-body appearance-none w-full h-11 px-3.5 pr-9 bg-white border rounded-[var(--radius-input)]',
              'border-[var(--color-border)] focus:outline-none focus:border-event-blue focus:shadow-[var(--shadow-focus-blue)]',
              error && 'border-pmi-red focus:border-pmi-red focus:shadow-none',
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
          <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
        </div>
        {error && <p className="text-xs font-medium text-pmi-red">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'