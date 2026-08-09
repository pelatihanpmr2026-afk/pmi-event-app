'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

const TNC_CONTENT = [
  'Data peserta, pendamping, dan sekolah yang diinput dalam formulir ini adalah benar dan dapat dipertanggungjawabkan.',
  'Pihak sekolah (melalui pembina/pelatih yang mendaftarkan) bertanggung jawab penuh atas kebenaran seluruh data yang didaftarkan.',
  'Biaya pendaftaran yang sudah dibayarkan tidak dapat dikembalikan (non-refundable), kecuali kegiatan dibatalkan sepenuhnya oleh panitia.',
  'Seluruh peserta dan pendamping wajib mengikuti rangkaian kegiatan sesuai jadwal yang ditentukan oleh panitia.',
  'Panitia berhak melakukan verifikasi ulang terhadap data yang didaftarkan, dan berhak menolak atau membatalkan pendaftaran apabila ditemukan ketidaksesuaian data.',
  'Peserta dan pendamping wajib menjaga ketertiban, keamanan, dan mematuhi seluruh tata tertib yang berlaku selama kegiatan berlangsung.',
  'Panitia tidak bertanggung jawab atas kehilangan atau kerusakan barang pribadi peserta/pendamping selama kegiatan berlangsung.',
  'Dengan menekan tombol "Setuju", pihak pendaftar menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan di atas.',
]

export function TermsModal({
  isOpen,
  onClose,
  onAgree,
  onDisagree,
  isSubmitting,
}: {
  isOpen: boolean
  onClose: () => void
  onAgree: () => void
  onDisagree: () => void
  isSubmitting?: boolean
}) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset scroll state when the modal transitions from closed -> open.
  // Done during render (not in an effect) per React's guidance for
  // "adjusting state when a prop changes": https://react.dev/learn/you-might-not-need-an-effect
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) setHasScrolledToBottom(false)
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20
    if (isAtBottom) setHasScrolledToBottom(true)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SYARAT & KETENTUAN">
      <div className="flex flex-col gap-4">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-72 overflow-y-auto border-2 border-event-navy/20 p-4 flex flex-col gap-3"
        >
          {TNC_CONTENT.map((point, i) => (
            <p key={i} className="font-body text-xs text-event-navy leading-relaxed">
              <span className="font-bold">{i + 1}.</span> {point}
            </p>
          ))}
        </div>

        {!hasScrolledToBottom && (
          <p className="font-body text-[11px] text-event-navy/50 text-center">
            Gulir sampai bawah untuk mengaktifkan tombol persetujuan
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="button" variant="outline" onClick={onDisagree} disabled={isSubmitting} className="flex-1">
            Tidak Setuju
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onAgree}
            disabled={!hasScrolledToBottom}
            isLoading={isSubmitting}
            className="flex-1"
          >
            Setuju & Kirim Pendaftaran
          </Button>
        </div>
      </div>
    </Modal>
  )
}