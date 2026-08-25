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
    <div className="border-3 border-event-navy rounded-[var(--radius-card)] bg-event-blue/10 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-pixel">
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-sm text-event-navy">Draft pendaftaran ditemukan</p>
        <p className="font-body text-xs text-gray-500 mt-0.5">
          Kamu punya data yang belum selesai dari {waktu}. Mau dilanjutkan?
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onRestore}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-event-blue text-white border-3 border-event-navy shadow-pixel rounded-[var(--radius-btn)] text-sm font-medium hover:bg-event-blue-dark transition-all"
        >
          <RotateCcw size={16} />
          Lanjutkan
        </button>
        <button
          onClick={onDiscard}
          className="flex items-center justify-center w-10 h-10 bg-white text-pmi-red border-3 border-event-navy rounded-[var(--radius-btn)] hover:bg-red-50 transition-colors"
          title="Hapus draft & mulai dari awal"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}