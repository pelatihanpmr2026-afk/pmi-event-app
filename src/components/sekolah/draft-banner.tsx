'use client'

import { RotateCcw, Trash2 } from 'lucide-react'

export function DraftBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: number
  onRestore: () => void
  onDiscard: () => void
}) {
  const waktu = new Date(savedAt).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="border-3 border-event-blue bg-event-blue/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-pixel-pop">
      <div className="flex-1 min-w-0">
        <p className="font-body font-bold text-sm text-event-navy">Draft pendaftaran ditemukan</p>
        <p className="font-body text-xs text-event-navy/70 mt-0.5">
          Kamu punya data yang belum selesai dari {waktu}. Mau dilanjutkan?
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onRestore}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-event-blue text-white border-3 border-event-navy font-body font-bold text-xs shadow-pixel-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <RotateCcw size={14} />
          Lanjutkan
        </button>
        <button
          onClick={onDiscard}
          className="flex items-center justify-center w-10 h-10 bg-white text-pmi-red border-3 border-event-navy hover:bg-pmi-red/10 transition-colors"
          title="Hapus draft & mulai dari awal"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}