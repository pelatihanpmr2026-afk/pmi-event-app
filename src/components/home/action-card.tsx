
import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'

export function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
  variant,
}: {
  href: string
  icon: LucideIcon
  title: string
  description: string
  badge?: string
  variant: 'blue' | 'pink' | 'yellow'
}) {
  const styles = {
    blue: {
      header: 'bg-event-blue text-white',
      shadow: 'hover:shadow-pixel-blue',
      iconBg: 'bg-white/20 border-white/40',
    },
    pink: {
      header: 'bg-event-pink text-white',
      shadow: 'hover:shadow-pixel-pink',
      iconBg: 'bg-white/20 border-white/40',
    },
    yellow: {
      header: 'bg-event-yellow text-event-navy',
      shadow: 'hover:shadow-pixel-yellow',
      iconBg: 'bg-event-navy/15 border-event-navy/30',
    },
  }[variant]

  return (
    <Link href={href} className="group block">
      <div
        className={`bg-white border-3 border-event-navy shadow-pixel ${styles.shadow} transition-all duration-150 group-hover:-translate-x-1 group-hover:-translate-y-1 group-active:translate-x-0 group-active:translate-y-0 group-active:shadow-none h-full flex flex-col`}
      >
        <div className={`${styles.header} px-4 py-4 flex items-center gap-3 border-b-3 border-event-navy`}>
          <div className={`w-11 h-11 ${styles.iconBg} border-2 flex items-center justify-center shrink-0`}>
            <Icon size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-[11px] sm:text-xs leading-tight">{title}</h3>
            {badge && (
              <span className="font-body text-[10px] opacity-80 mt-0.5 block">{badge}</span>
            )}
          </div>
        </div>
        <div className="px-4 py-4 flex-1 flex flex-col justify-between gap-3">
          <p className="font-body text-xs text-event-navy/70 leading-relaxed">{description}</p>
          <div className="flex items-center gap-1.5 font-body text-xs font-bold text-event-navy group-hover:gap-3 transition-all">
            Mulai
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  )
}