'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ASAL_UNIT_OPTIONS } from '@/lib/constants'
import { formatRp } from '@/lib/keuangan'

export interface BulkPerdiemItem {
  id: string
  hadir: number
  perdiem: number
}

export interface BulkPerdiemTarget {
  id: string
  asalUnit: string
  hadir: number
}

type BulkMode = 'per_hari' | 'borongan'

function findLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((opt) => opt.value === value)?.label ?? value
}

export function PanitiaPerdiemBulkModal({
  panitia,
  jumlahSesi,
  isOpen,
  onClose,
  onSaved,
}: {
  panitia: BulkPerdiemTarget[]
  jumlahSesi: number
  isOpen: boolean
  onClose: () => void
  onSaved: (items: BulkPerdiemItem[]) => void
}) {
  const [mode, setMode] = useState<BulkMode>('per_hari')
  const [nominal, setNominal] = useState('0')
  const [unit, setUnit] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function handleNominalChange(value: string) {
    // Hanya digit yang disimpan; tampilan diformat via preview.
    setNominal(value.replace(/[^\d]/g, '').slice(0, 10))
  }

  const nominalNumber = Number(nominal || '0')
  const dalamUnit = unit ? panitia.filter((p) => p.asalUnit === unit) : []
  const eligible = dalamUnit.filter((p) => p.hadir > 0)
  const dasarBorongan = eligible.length > 0 ? Math.floor(nominalNumber / eligible.length) : 0

  async function handleSubmit() {
    if (!Number.isInteger(nominalNumber) || nominalNumber < 0) {
      toast.error('Nominal tidak valid')
      return
    }

    let body: Record<string, unknown>
    let pesanKonfirmasi: string
    if (mode === 'borongan') {
      if (!unit) {
        toast.error('Pilih unit dulu')
        return
      }
      const ids = dalamUnit.map((p) => p.id)
      if (ids.length === 0) {
        toast.error(`Tidak ada panitia ${findLabel(ASAL_UNIT_OPTIONS, unit)} pada filter aktif`)
        return
      }
      if (eligible.length === 0) {
        toast.error('Tidak ada panitia unit tersebut yang memiliki kehadiran')
        return
      }
      body = { mode: 'borongan', totalDana: nominalNumber, unit, ids }
      pesanKonfirmasi =
        `Bagi ${formatRp(nominalNumber)} ke ${eligible.length} panitia ${findLabel(ASAL_UNIT_OPTIONS, unit)} yang hadir ` +
        `(±${formatRp(dasarBorongan)}/orang)?`
    } else {
      const ids = panitia.map((p) => p.id)
      if (ids.length === 0) {
        toast.error('Tidak ada panitia yang cocok dengan filter')
        return
      }
      body = { mode: 'per_hari', nominalPerHari: nominalNumber, ids }
      pesanKonfirmasi = `Hitung perdiem ${formatRp(nominalNumber)}/hari × kehadiran untuk ${ids.length} panitia?`
    }

    if (!confirm(pesanKonfirmasi)) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/panitia/perdiem-bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      title="PERDIEM MASSAL"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('per_hari')}
            disabled={isSaving}
            className={`px-3 py-2 border-2 font-body font-bold text-xs transition-colors ${
              mode === 'per_hari'
                ? 'border-event-navy bg-event-yellow text-event-navy'
                : 'border-event-navy/30 text-event-navy/50'
            }`}
          >
            Per Hari × Hadir
          </button>
          <button
            type="button"
            onClick={() => setMode('borongan')}
            disabled={isSaving}
            className={`px-3 py-2 border-2 font-body font-bold text-xs transition-colors ${
              mode === 'borongan'
                ? 'border-event-navy bg-event-yellow text-event-navy'
                : 'border-event-navy/30 text-event-navy/50'
            }`}
          >
            Borongan per Unit
          </button>
        </div>

        {mode === 'borongan' ? (
          <>
            <Select
              placeholder="Pilih Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={[...ASAL_UNIT_OPTIONS]}
            />
            <Input
              label="Total Dana Borongan (Rp)"
              value={nominal}
              onChange={(e) => handleNominalChange(e.target.value)}
              disabled={isSaving}
              inputMode="numeric"
              placeholder="cth: 1000000"
            />
            <div className="border-3 border-event-navy bg-event-yellow/20 p-3">
              <p className="font-body text-xs text-event-navy">
                {unit ? (
                  eligible.length > 0 ? (
                    <>
                      Dibagi ke <span className="font-bold">{eligible.length} panitia {findLabel(ASAL_UNIT_OPTIONS, unit)} yang hadir</span>:
                      ±<span className="font-bold">{formatRp(dasarBorongan)}/orang</span>
                      {dalamUnit.length - eligible.length > 0 && (
                        <> ({dalamUnit.length - eligible.length} tanpa hadir = Rp0)</>
                      )}. Sisa pembulatan dibagi +Rp1 dari depan.
                    </>
                  ) : (
                    <>Belum ada panitia {findLabel(ASAL_UNIT_OPTIONS, unit)} yang memiliki kehadiran pada filter aktif.</>
                  )
                ) : (
                  <>Pilih unit untuk melihat preview pembagian.</>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
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
            <div className="border-3 border-event-navy bg-event-yellow/20 p-3">
              <p className="font-body text-xs text-event-navy">
                Berlaku untuk <span className="font-bold">{panitia.length} panitia</span> sesuai filter aktif.
                Tanpa kehadiran = Rp0. Data absensi tidak berubah.
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Batal</Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSaving} isLoading={isSaving}>
            {mode === 'borongan' ? 'Bagi Dana' : `Hitung ${panitia.length} Panitia`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
