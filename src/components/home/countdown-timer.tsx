'use client'

import { useEffect, useState } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="bg-event-navy border-3 border-event-navy shadow-pixel px-3 py-3 sm:px-5 sm:py-4 min-w-[62px] sm:min-w-[84px]">
        <span className="font-heading text-xl sm:text-3xl text-event-yellow tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="font-body text-[10px] sm:text-xs font-bold text-event-navy/60 uppercase tracking-wide">
        {label}
      </span>
    </div>
  )
}

export function CountdownTimer({ targetDate }: { targetDate: string }) {
  // undefined = belum mounted di client, null = waktu sudah lewat
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null | undefined>(undefined)

  useEffect(() => {
    const target = new Date(targetDate)

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(target))
    }, 1000)

    // Panggilan pertama dijadwalkan async (bukan langsung di badan effect)
    // supaya tidak memicu cascading render sesuai aturan React.
    const initial = setTimeout(() => {
      setTimeLeft(calculateTimeLeft(target))
    }, 0)

    return () => {
      clearInterval(timer)
      clearTimeout(initial)
    }
  }, [targetDate])

  if (timeLeft === undefined) {
    return <div className="h-24 sm:h-32" aria-hidden="true" />
  }

  if (timeLeft === null) {
    return (
      <div className="bg-event-pink border-3 border-event-navy shadow-pixel px-6 py-4">
        <span className="font-heading text-sm sm:text-base text-white">EVENT SEDANG BERLANGSUNG!</span>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      <TimeUnit value={timeLeft.days} label="Hari" />
      <span className="font-heading text-lg sm:text-2xl text-event-navy/30 pb-7 animate-blink">:</span>
      <TimeUnit value={timeLeft.hours} label="Jam" />
      <span className="font-heading text-lg sm:text-2xl text-event-navy/30 pb-7 animate-blink">:</span>
      <TimeUnit value={timeLeft.minutes} label="Menit" />
      <span className="font-heading text-lg sm:text-2xl text-event-navy/30 pb-7 animate-blink">:</span>
      <TimeUnit value={timeLeft.seconds} label="Detik" />
    </div>
  )
}