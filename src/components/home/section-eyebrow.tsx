import type { LucideIcon } from 'lucide-react'

const VARIANT_BG: Record<string, string> = {
  pink: 'bg-event-pink text-white',
  blue: 'bg-event-blue text-white',
  yellow: 'bg-event-yellow text-event-navy',
  navy: 'bg-event-navy text-white',
}

/**
 * SectionEyebrow — the small bordered pill label used above every section
 * heading ("TENTANG EVENT", "PENDAFTARAN", ...). Extracted from the repeated
 * inline markup in page.tsx so every section stays visually consistent.
 */
export function SectionEyebrow({
  label,
  icon: Icon,
  variant = 'yellow',
  index,
}: {
  label: string
  icon?: LucideIcon
  variant?: keyof typeof VARIANT_BG
  index?: string
}) {
  return (
    <div
      className={`pixel-corners-sm inline-flex items-center gap-2 border-3 border-event-navy px-4 py-1.5 ${VARIANT_BG[variant]}`}
    >
      {index && <span className="font-heading text-[8px] opacity-60">{index}</span>}
      {Icon && <Icon size={14} />}
      <span className="font-heading text-[9px] tracking-wide">{label}</span>
    </div>
  )
}