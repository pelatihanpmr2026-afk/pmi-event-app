import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="font-body font-medium text-sm text-event-navy">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'font-body w-full h-11 px-3.5 bg-white border rounded-[var(--radius-input)]',
            'placeholder:text-gray-400 text-event-navy',
            'border-[var(--color-border)] focus:outline-none focus:border-event-blue focus:shadow-[var(--shadow-focus-blue)]',
            error && 'border-pmi-red focus:border-pmi-red focus:shadow-none',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
        {error && <p className="text-xs font-medium text-pmi-red">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'