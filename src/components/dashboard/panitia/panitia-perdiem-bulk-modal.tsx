'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatRp } from '@/lib/keuangan'

export interface BulkPerdiemItem {
  id: string
  hadir: number
  perdiem: number
}

export function PanitiaPerdiemBulkModal({
  ids,
  jumlahSesi,
  isOpen,
  onClose,
  onSaved,
}: {
  ids: string[]
  jumlahSesi: number
  isOpen: boolean
  onClose: () => void
  onSaved: (items: BulkPerdiemItem[]) => void
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
      toast.error('Nominal per hari tidak valid')
      return
    }
    if (!confirm(`Hitung perdiem ${formatRp(nominalNumber)}/hari × kehadiran untuk ${ids.length} panitia?`)) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/panitia/perdiem-bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nominalPerHari: nominalNumber, ids }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan perdiem massal')
      toast.success(
        `Perdiem ${result.data.jumlahDiperbarui} panitia dihitung, total ${formatRp(result.data.totalPerdiem)}`
      )
      onSaved(result.data.items)
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
      title="PERDIEM MASSAL PER HARI"
    >
      <div className="flex flex-col gap-4">
        <div className="border-3 border-event-navy bg-event-yellow/20 p-3">
          <p className="font-body text-xs text-event-navy">
            Perdiem = nominal per hari × jumlah kehadiran, untuk <span className="font-bold">{ids.length} panitia</span> yang
            tampil sesuai filter aktif dari <span className="font-bold">{jumlahSesi} sesi absensi</span>.
            Panitia tanpa kehadiran mendapat Rp0. Data absensi tidak berubah.
          </p>
        </div>

        <Input
          label="Nominal Per Hari (Rp)"
          value={nominal}
          onChange={(e) => handleNominalChange(e.target.value)}
          disabled={isSaving}
          inputMode="numeric"
          placeholder="cth: 50000"
        />
        <p className="font-body font-bold text-sm text-event-navy -mt-2">
          Preview hadir penuh ({jumlahSesi} hari): {formatRp(nominalNumber * jumlahSesi)}
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Batal</Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving || ids.length === 0}
            isLoading={isSaving}
          >
            Hitung {ids.length} Panitia
          </Button>
        </div>
      </div>
    </Modal>
  )
}
