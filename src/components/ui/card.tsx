import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, pixel, ...props }: HTMLAttributes<HTMLDivElement> & { pixel?: boolean }) {
  return (
    <div
      className={cn(
        pixel
          ? 'bg-white border-3 border-event-navy rounded-[var(--radius-card)] shadow-pixel'
          : 'bg-white border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)]',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  variant = 'blue',
  pixel,
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: 'blue' | 'pink' | 'yellow' | 'plain'; pixel?: boolean }) {
  const styles = {
    blue: 'bg-event-blue text-white',
    pink: 'bg-event-pink text-white',
    yellow: 'bg-event-yellow text-event-navy',
    plain: 'bg-transparent text-event-navy border-b border-[var(--color-border)]',
  }[variant]

  return (
    <div
      className={cn(
        'px-5 py-4 rounded-t-[var(--radius-card)]',
        variant !== 'plain' && 'rounded-t-[var(--radius-card)]',
        pixel && variant !== 'plain' && 'border-b-3 border-event-navy',
        styles,
        className
      )}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}