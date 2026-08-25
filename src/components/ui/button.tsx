import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  pixel?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-event-blue text-white hover:bg-event-blue-dark focus-visible:shadow-[var(--shadow-focus-blue)]',
  secondary: 'bg-event-pink text-white hover:bg-event-pink-dark focus-visible:shadow-[var(--shadow-focus-pink)]',
  accent: 'bg-event-yellow text-event-navy hover:bg-event-yellow-dark',
  outline: 'bg-white text-event-navy border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]',
  danger: 'bg-pmi-red text-white hover:bg-red-700',
  ghost: 'bg-transparent text-event-navy hover:bg-[var(--color-surface-muted)]',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', pixel, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-body font-semibold rounded-[var(--radius-btn)] transition-all duration-150',
          pixel
            ? 'border-3 border-event-navy shadow-pixel hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0 active:translate-y-0 active:shadow-none'
            : 'shadow-[var(--shadow-soft)] active:scale-[0.98]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span>Memproses...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'