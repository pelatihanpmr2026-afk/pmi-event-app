import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border-3 border-event-navy shadow-pixel-lg',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  variant = 'blue',
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: 'blue' | 'pink' | 'yellow' }) {
  const bg = {
    blue: 'bg-event-blue text-white',
    pink: 'bg-event-pink text-white',
    yellow: 'bg-event-yellow text-event-navy',
  }[variant]

  return (
    <div
      className={cn('px-6 py-4 border-b-3 border-event-navy', bg, className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />
}