import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'info' | 'default' | 'danger'

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-500 text-white',
  warning: 'bg-event-yellow text-event-navy',
  info: 'bg-event-blue text-white',
  default: 'bg-event-navy text-white',
  danger: 'bg-pmi-red text-white',
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-block px-3 py-1 text-xs font-bold border-2 border-event-navy',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}