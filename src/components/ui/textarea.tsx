import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="font-body font-bold text-sm text-event-navy">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          rows={4}
          className={cn(
            'font-body px-4 py-3 bg-white border-3 border-event-navy text-event-navy resize-none',
            'placeholder:text-event-navy/40',
            'focus:outline-none focus:shadow-pixel-sm focus:-translate-x-[1px] focus:-translate-y-[1px]',
            'transition-all duration-100',
            error && 'border-pmi-red',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-bold text-pmi-red">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'