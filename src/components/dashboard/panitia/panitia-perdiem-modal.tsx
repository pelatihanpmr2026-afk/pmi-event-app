'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatRp } from '@/lib/keuangan'
import type { PanitiaData } from './panitia-detail-modal'

export function PanitiaPerdiemModal({
  panitia,
  isOpen,
  onClose,
  onSaved,
}: {
  panitia: PanitiaData | null
  isOpen: boolean
  onClose: () => void
  onSaved: (id: string, perdiem: number) => void
}) {
  // State diinisialisasi dari data panitia; parent me-remount modal
  // via key={panitia.id} setiap kali dibuka untuk panitia berbeda.
  const [nominal, setNominal] = useState(panitia ? String(panitia.perdiem ?? 0) : '0')
  const [isSaving, setIsSaving] = useState(false)

  function handleNominalChange(value: string) {
    // Hanya digit yang disimpan; tampilan diformat via preview.
    setNominal(value.replace(/[^\d]/g, '').slice(0, 9))
  }

  const nominalNumber = Number(nominal || '0')

  async function handleSubmit() {
    if (!panitia) return
    if (!Number.isInteger(nominalNumber) || nominalNumber < 0) {
      toast.error('Nominal perdiem tidak valid')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/panitia/${panitia.id}/perdiem`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perdiem: nominalNumber }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan perdiem')
      toast.success(`Perdiem ${panitia.nama} diset ${formatRp(result.data.perdiem)}`)
      onSaved(panitia.id, result.data.perdiem)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!isSaving) onClose() }}
      title={panitia ? `PERDIEM - ${panitia.nomorRegistrasi}` : 'PERDIEM PANITIA'}
    >
      <div className="flex flex-col gap-4">
        <div className="border-3 border-event-navy bg-event-cream p-3">
          <p className="font-body font-bold text-sm text-event-navy">{panitia?.nama}</p>
          <p className="font-body text-xs text-event-navy/60">
            Perdiem saat ini: <span className="font-bold">{formatRp(panitia?.perdiem ?? 0)}</span>
          </p>
        </div>

        <Input
          label="Nominal Perdiem (Rp)"
          value={nominal}
          onChange={(e) => handleNominalChange(e.target.value)}
          disabled={isSaving}
          inputMode="numeric"
          placeholder="cth: 150000"
        />
        <p className="font-body font-bold text-sm text-event-navy -mt-2">
          Preview: {formatRp(nominalNumber)}
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Batal</Button>
          <Button type="button" onClick={() => void handleSubmit()} isLoading={isSaving}>Simpan Perdiem</Button>
        </div>
      </div>
    </Modal>
  )
}
