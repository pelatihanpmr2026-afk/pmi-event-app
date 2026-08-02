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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="font-body font-bold text-sm text-event-navy">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'font-body px-4 py-3 bg-white border-3 border-event-navy text-event-navy',
            'placeholder:text-event-navy/40',
            'focus:outline-none focus:shadow-pixel-sm focus:-translate-x-[1px] focus:-translate-y-[1px]',
            'transition-all duration-100',
            error && 'border-pmi-red',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-event-navy/60">{hint}</p>}
        {error && <p className="text-xs font-bold text-pmi-red">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'