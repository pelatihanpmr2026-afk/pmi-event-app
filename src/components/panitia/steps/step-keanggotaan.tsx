'use client'

import { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Select } from '@/components/ui/select'
import { ASAL_UNIT_OPTIONS, DIVISI_OPTIONS } from '@/lib/constants'
import { PanitiaFormValues } from '@/lib/validations/panitia'

interface CapacityInfo {
  divisi: string
  max: number
  terisi: number
  sisa: number
  penuh: boolean
}

export function StepKeanggotaan({ form }: { form: UseFormReturn<PanitiaFormValues> }) {
  const {
    register,
    watch,
    formState: { errors },
  } = form

  const [capacity, setCapacity] = useState<CapacityInfo[]>([])
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(true)

  const selectedDivisi = watch('divisi')

  useEffect(() => {
    async function fetchCapacity() {
      try {
        const res = await fetch('/api/panitia/capacity')
        const result = await res.json()
        if (result.success) {
          setCapacity(result.data)
        }
      } catch {
        // Diamkan — kalau gagal fetch, dropdown tetap tampil normal tanpa info kuota,
        // validasi tetap dijamin benar di server saat submit.
      } finally {
        setIsLoadingCapacity(false)
      }
    }
    fetchCapacity()
  }, [])

  const divisiOptionsWithCapacity = DIVISI_OPTIONS.map((opt) => {
    const info = capacity.find((c) => c.divisi === opt.value)
    return {
      value: opt.value,
      label: info ? `${opt.label} (${info.sisa}/${info.max} tersisa)` : opt.label,
      disabled: info?.penuh ?? false,
    }
  })

  const selectedInfo = capacity.find((c) => c.divisi === selectedDivisi)

  return (
    <div className="flex flex-col gap-5">
      <Select
        id="asalUnit"
        label="Asal Unit"
        placeholder="Pilih asal unit"
        options={[...ASAL_UNIT_OPTIONS]}
        error={errors.asalUnit?.message}
        {...register('asalUnit')}
      />

      <Select
        id="divisi"
        label="Divisi yang Dipilih"
        placeholder={isLoadingCapacity ? 'Memuat data kuota...' : 'Pilih divisi'}
        options={divisiOptionsWithCapacity}
        error={errors.divisi?.message}
        disabled={isLoadingCapacity}
        {...register('divisi')}
      />

      {selectedInfo && (
        <div
          className={`border-3 border-event-navy p-4 ${
            selectedInfo.penuh ? 'bg-pmi-red/10' : 'bg-event-cream'
          }`}
        >
          <p className="font-body text-xs text-event-navy">
            {selectedInfo.penuh
              ? '⚠️ Divisi ini sudah penuh, silakan pilih divisi lain.'
              : `✅ Sisa kuota: ${selectedInfo.sisa} dari ${selectedInfo.max} orang.`}
          </p>
        </div>
      )}

      <div className="bg-event-cream border-3 border-event-navy p-4">
        <p className="font-body text-xs text-event-navy/70">
          💡 Pastikan divisi yang dipilih sesuai dengan penugasan yang sudah dikoordinasikan dengan
          Ketua Pelaksana / Komandan.
        </p>
      </div>
    </div>
  )
}