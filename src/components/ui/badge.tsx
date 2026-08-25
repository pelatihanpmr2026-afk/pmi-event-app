import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'info' | 'default' | 'danger'

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  info: 'bg-blue-50 text-event-blue-dark ring-1 ring-blue-200',
  default: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  danger: 'bg-red-50 text-pmi-red ring-1 ring-red-200',
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}