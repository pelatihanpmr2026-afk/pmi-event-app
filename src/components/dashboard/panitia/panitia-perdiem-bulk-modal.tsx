'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatRp } from '@/lib/keuangan'

export function PanitiaPerdiemBulkModal({
  ids,
  isOpen,
  onClose,
  onSaved,
}: {
  ids: string[]
  isOpen: boolean
  onClose: () => void
  onSaved: (ids: string[], perdiem: number) => void
}) {
  const [nominal, setNominal] = useState('0')
  const [isSaving, setIsSaving] = useState(false)

  function handleNominalChange(value: string) {
    // Hanya digit yang disimpan; tampilan diformat via preview.
    setNominal(value.replace(/[^\d]/g, '').slice(0, 9))
  }

  const nominalNumber = Number(nominal || '0')

  async function handleSubmit() {
    if (ids.length === 0) {
      toast.error('Tidak ada panitia yang cocok dengan filter')
      return
    }
    if (!Number.isInteger(nominalNumber) || nominalNumber < 0) {
      toast.error('Nominal perdiem tidak valid')
      return
    }
    if (!confirm(`Set perdiem ${formatRp(nominalNumber)} untuk ${ids.length} panitia?`)) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/panitia/perdiem-bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perdiem: nominalNumber, ids }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan perdiem massal')
      toast.success(`Perdiem ${result.data.jumlahDiperbarui} panitia diset ${formatRp(nominalNumber)}`)
      onSaved(ids, nominalNumber)
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
      title="PERDIEM MASSAL"
    >
      <div className="flex flex-col gap-4">
        <div className="border-3 border-event-navy bg-event-yellow/20 p-3">
          <p className="font-body text-xs text-event-navy">
            Satu nominal berlaku untuk <span className="font-bold">{ids.length} panitia</span> yang
            tampil sesuai filter aktif (pencarian/unit/divisi). Data absensi tidak berubah.
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
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving || ids.length === 0}
            isLoading={isSaving}
          >
            Simpan ke {ids.length} Panitia
          </Button>
        </div>
      </div>
    </Modal>
  )
}
