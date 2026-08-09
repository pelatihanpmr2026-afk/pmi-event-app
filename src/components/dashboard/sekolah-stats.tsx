'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useSpring, useMotionValueEvent } from 'motion/react'
import { Card } from '@/components/ui/card'
import { School, Users, UserCheck, Clock } from 'lucide-react'

// Animated counter component – now uses state to avoid MotionValue rendering errors
function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const spring = useSpring(0, { stiffness: 50, damping: 20, duration })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (isInView) spring.set(value)
  }, [isInView, spring, value])

  useMotionValueEvent(spring, 'change', (latest) => {
    setDisplay(Math.round(latest).toLocaleString())
  })

  return <span ref={ref}>{display}</span>
}

export function SekolahStats({
  totalSekolah,
  totalPeserta,
  totalPendamping,
  menungguKonfirmasi,
}: {
  totalSekolah: number
  totalPeserta: number
  totalPendamping: number
  menungguKonfirmasi: number
}) {
  const cards = [
    { icon: School, label: 'Total Sekolah', value: totalSekolah, variant: 'blue' as const },
    { icon: Users, label: 'Total Peserta', value: totalPeserta, variant: 'default' as const },
    { icon: UserCheck, label: 'Total Pendamping', value: totalPendamping, variant: 'default' as const },
    { icon: Clock, label: 'Menunggu Konfirmasi', value: menungguKonfirmasi, variant: 'alert' as const },
  ]

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1 },
        },
      }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10"
    >
      {cards.map((c) => (
        <motion.div
          key={c.label}
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
          whileHover={{ y: -6, transition: { duration: 0.15 } }}
          className="pixel-card"
        >
          <Card
            className={`relative p-5 sm:p-6 flex flex-col gap-4 border-2 border-event-navy shadow-pixel-lg transition-all duration-200 
              ${c.variant === 'blue' ? 'bg-event-blue text-white' : ''}
              ${c.variant === 'alert' ? 'bg-event-pink text-white' : ''}
              ${c.variant === 'default' ? 'bg-white text-event-navy' : ''}
              hover:shadow-pixel-xl`}
          >
            <div
              className={`w-12 h-12 border-2 flex items-center justify-center ${
                c.variant === 'blue' || c.variant === 'alert'
                  ? 'bg-white/20 border-white/40'
                  : 'bg-event-navy/10 border-event-navy/20'
              }`}
            >
              <c.icon size={24} className={c.variant === 'default' ? 'text-event-navy' : 'text-white'} />
            </div>
            <div>
              <span
                className={`font-heading text-3xl sm:text-4xl block ${
                  c.variant === 'default' ? 'text-event-navy' : 'text-white'
                }`}
              >
                <AnimatedCounter value={c.value} />
              </span>
              <span className={`font-body text-sm ${c.variant === 'default' ? 'text-event-navy/70' : 'text-white/80'}`}>
                {c.label}
              </span>
            </div>
            {c.variant === 'blue' && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-event-yellow border-2 border-event-navy" />
            )}
            {c.variant === 'alert' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-event-yellow border-2 border-event-navy animate-pulse" />
            )}
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}