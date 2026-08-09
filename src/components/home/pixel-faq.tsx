'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

interface FaqItem {
  q: string
  a: string
}

export function PixelFaq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={i}
            className={`border-3 border-event-navy transition-all duration-150 ${
              isOpen ? 'bg-white shadow-pixel' : 'bg-white/60'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
              <span className="font-body font-bold text-xs sm:text-sm text-event-navy">{item.q}</span>
              <div
                className={`w-7 h-7 border-2 border-event-navy flex items-center justify-center shrink-0 transition-colors ${
                  isOpen ? 'bg-event-pink text-white' : 'bg-event-yellow text-event-navy'
                }`}
              >
                {isOpen ? <Minus size={13} /> : <Plus size={13} />}
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 animate-pixel-pop">
                <p className="font-body text-xs text-event-navy/70 leading-relaxed border-t-2 border-event-navy/10 pt-3">
                  {item.a}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}