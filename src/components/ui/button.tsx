import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-event-blue text-white shadow-pixel-blue hover:bg-event-blue-dark',
  secondary: 'bg-event-pink text-white shadow-pixel-pink hover:bg-event-pink-dark',
  accent: 'bg-event-yellow text-event-navy shadow-pixel-yellow hover:bg-event-yellow-dark',
  outline: 'bg-white text-event-navy shadow-pixel hover:bg-event-cream',
  danger: 'bg-pmi-red text-white shadow-pixel hover:bg-red-700',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'font-body font-bold border-3 border-event-navy transition-all duration-100',
          'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-pixel',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-3 w-3 animate-blink bg-current" />
            Memproses...
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'