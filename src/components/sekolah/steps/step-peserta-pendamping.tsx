'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { PesertaCard } from '../peserta-card'
import { PendampingCard } from '../pendamping-card'
import { PesertaTable } from '../peserta-table'
import { PendampingTable } from '../pendamping-table'
import {
  pesertaPendampingSchema,
  PesertaPendampingValues,
  createEmptyPeserta,
  createEmptyPendamping,
} from '@/lib/validations/peserta'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from '@/lib/constants-sekolah'

export function StepPesertaPendamping({
  onComplete,
  onBack,
  defaultValues,
  onDraftChange,
}: {
  onComplete: (result: PesertaPendampingValues) => void
  onBack: () => void
  defaultValues?: PesertaPendampingValues
  onDraftChange?: (values: PesertaPendampingValues) => void
}) {
  const [activeTab, setActiveTab] = useState<'peserta' | 'pendamping'>('peserta')

  const form = useForm<PesertaPendampingValues>({
    resolver: zodResolver(pesertaPendampingSchema),
    defaultValues: defaultValues ?? {
      peserta: [createEmptyPeserta()],
      pendamping: [],
    },
  })

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = form

  const pesertaArray = useFieldArray({ control, name: 'peserta' })
  const pendampingArray = useFieldArray({ control, name: 'pendamping' })

  // Auto-save draft tiap 2 detik setelah user berhenti mengetik
  const watchedValues = watch()

  useEffect(() => {
    if (!onDraftChange) return

    const timer = setTimeout(() => {
      onDraftChange(watchedValues as PesertaPendampingValues)
    }, 2000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify({ p: watchedValues.peserta?.length, d: watchedValues.pendamping?.length }), watchedValues])

  const jumlahPeserta = watch('peserta')?.length ?? 0
  const jumlahPendamping = watch('pendamping')?.length ?? 0
  const totalBiaya = jumlahPeserta * BIAYA_PESERTA + jumlahPendamping * BIAYA_PENDAMPING

  function onSubmit(values: PesertaPendampingValues) {
    onComplete(values)
  }

  function handleFormError() {
    toast.error('Mohon lengkapi semua data peserta/pendamping dengan benar')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, handleFormError)} className="flex flex-col gap-6">
      <Tabs
        tabs={[
          { key: 'peserta', label: 'Peserta', badge: jumlahPeserta },
          { key: 'pendamping', label: 'Pendamping', badge: jumlahPendamping },
        ]}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'peserta' | 'pendamping')}
      />

      {activeTab === 'peserta' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-[11px] text-event-navy">DATA PESERTA</h3>
            <button
              type="button"
              onClick={() => pesertaArray.append(createEmptyPeserta())}
              className="flex items-center gap-1 px-3 py-2 bg-event-blue text-white border-2 border-event-navy font-body font-bold text-[11px]"
            >
              <Plus size={12} />
              Tambah Peserta
            </button>
          </div>

          {errors.peserta?.message && (
            <p className="text-xs font-bold text-pmi-red">{errors.peserta.message}</p>
          )}

          <div className="md:hidden flex flex-col gap-3">
            {pesertaArray.fields.map((field, index) => (
              <PesertaCard
                key={field.id}
                form={form}
                index={index}
                canRemove={pesertaArray.fields.length > 1}
                onRemove={() => pesertaArray.remove(index)}
              />
            ))}
          </div>

          <div className="hidden md:block">
            <PesertaTable form={form} fields={pesertaArray.fields} onRemove={pesertaArray.remove} />
          </div>
        </div>
      )}

      {activeTab === 'pendamping' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-[11px] text-event-navy">DATA PENDAMPING</h3>
            <button
              type="button"
              onClick={() => pendampingArray.append(createEmptyPendamping())}
              className="flex items-center gap-1 px-3 py-2 bg-event-pink text-white border-2 border-event-navy font-body font-bold text-[11px]"
            >
              <Plus size={12} />
              Tambah Pendamping
            </button>
          </div>

          {pendampingArray.fields.length === 0 && (
            <p className="font-body text-xs text-event-navy/50 text-center py-4 border-2 border-dashed border-event-navy/20 md:hidden">
              Belum ada pendamping ditambahkan (opsional)
            </p>
          )}

          <div className="md:hidden flex flex-col gap-3">
            {pendampingArray.fields.map((field, index) => (
              <PendampingCard
                key={field.id}
                form={form}
                index={index}
                onRemove={() => pendampingArray.remove(index)}
              />
            ))}
          </div>

          <div className="hidden md:block">
            <PendampingTable form={form} fields={pendampingArray.fields} onRemove={pendampingArray.remove} />
          </div>
        </div>
      )}

      <div className="border-3 border-event-navy bg-event-yellow/20 p-4 flex flex-col gap-1.5 sticky bottom-2">
        <div className="flex justify-between font-body text-xs text-event-navy">
          <span>{jumlahPeserta} Peserta × Rp35.000</span>
          <span>Rp{(jumlahPeserta * BIAYA_PESERTA).toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between font-body text-xs text-event-navy">
          <span>{jumlahPendamping} Pendamping × Rp25.000</span>
          <span>Rp{(jumlahPendamping * BIAYA_PENDAMPING).toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20">
          <span>TOTAL</span>
          <span>Rp{totalBiaya.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          Kembali
        </Button>
        <Button type="submit" variant="primary">
          Lanjut
        </Button>
      </div>
    </form>
  )
}