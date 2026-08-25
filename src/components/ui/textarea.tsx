import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="font-body font-medium text-sm text-event-navy">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          rows={4}
          style={{
            color: '#3653A5',
            WebkitTextFillColor: '#3653A5',
            caretColor: '#3653A5',
            backgroundColor: '#FFFFFF',
            ...style,
          }}
          className={cn(
            'font-body w-full px-3.5 py-3 bg-white border rounded-[var(--radius-input)] text-sm resize-none transition-all duration-150',
            'placeholder:text-gray-400',
            'border-[var(--color-border)] focus:outline-none focus:border-event-blue focus:shadow-[var(--shadow-focus-blue)]',
            error && 'border-pmi-red focus:border-pmi-red focus:shadow-none',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-pmi-red">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'