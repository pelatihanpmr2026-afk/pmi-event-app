'use client'

import { useForm, useFieldArray, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PendampingCard } from '../pendamping-card'
import { PendampingTable } from '../pendamping-table'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  pendampingOnlySchema,
  PendampingOnlyValues,
  PesertaPendampingValues,
  createEmptyPendamping,
} from '@/lib/validations/peserta'
import { BIAYA_PENDAMPING } from '@/lib/constants-sekolah'

export function StepPendamping({
  onComplete,
  onBack,
  defaultValues,
}: {
  onComplete: (values: Pick<PesertaPendampingValues, 'pendamping'>) => void
  onBack: () => void
  defaultValues?: Pick<PesertaPendampingValues, 'pendamping'>
}) {
  // BUG LAMA: step ini dulu pakai `pesertaPendampingSchema` (yang mewajibkan
  // peserta.min(1)), padahal form di step ini TIDAK PERNAH punya data
  // peserta (field peserta di form-nya cuma dihardcode []). Akibatnya
  // `isValid` selalu false dan tombol "Lanjut ke Review" selalu ke-block,
  // walaupun data pendamping yang diisi user sudah benar semua.
  // Fix: pakai schema khusus pendamping saja (pendampingOnlySchema).
  const form = useForm<PendampingOnlyValues>({
    resolver: zodResolver(pendampingOnlySchema),
    defaultValues: {
      pendamping: defaultValues?.pendamping ?? [],
    },
    mode: 'onChange',
  })

  const { control, handleSubmit, watch, formState: { errors, isValid } } = form
  const pendampingArray = useFieldArray({ control, name: 'pendamping' })
  const jumlahPendamping = watch('pendamping')?.length ?? 0
  const totalBiayaPendamping = jumlahPendamping * BIAYA_PENDAMPING

  // Sama seperti di StepPeserta: hanya SATU dari tampilan mobile (card)
  // atau desktop (table) yang boleh benar-benar ter-mount, supaya tidak
  // ada dua react-hook-form register() untuk nama field yang sama —
  // itulah penyebab keluhan "kursor ada tapi tidak bisa mengetik".
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    if (defaultValues) {
      form.reset({ pendamping: defaultValues.pendamping })
    }
  }, [defaultValues, form])

  async function onSubmit(values: PendampingOnlyValues) {
    onComplete({ pendamping: values.pendamping })
  }

  function handleFormError() {
    const fields = Object.keys(errors)
    if (fields.length > 0) {
      toast.error(`Mohon lengkapi data pendamping dengan benar. Field yang belum valid: ${fields.join(', ')}`)
    } else {
      toast.error('Terjadi kesalahan validasi')
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit, handleFormError)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-[11px] text-event-navy">DATA PENDAMPING (Opsional)</h3>
          </div>

          {isDesktop ? (
            <PendampingTable fields={pendampingArray.fields} onRemove={pendampingArray.remove} />
          ) : (
            <div className="flex flex-col gap-3">
              {pendampingArray.fields.length === 0 && (
                <p className="font-body text-sm text-gray-400 text-center py-4 border border-[var(--color-border)] rounded-[var(--radius-input)]">
                  Belum ada pendamping ditambahkan (opsional)
                </p>
              )}
              {pendampingArray.fields.map((field, index) => (
                <PendampingCard
                  key={field.id}
                  index={index}
                  onRemove={() => pendampingArray.remove(index)}
                />
              ))}
            </div>
          )}

          {/* Tombol Tambah Pendamping */}
          <button
            type="button"
            onClick={() => pendampingArray.append(createEmptyPendamping())}
            className="flex items-center justify-center gap-1 py-3 bg-event-pink text-white border-3 border-event-navy shadow-pixel rounded-[var(--radius-btn)] text-xs font-medium hover:bg-event-pink-dark transition-all md:w-48 md:self-end mt-2"
          >
            <Plus size={16} />
            Tambah Pendamping
          </button>
        </div>

        {/* Ringkasan Biaya Pendamping */}
        <div className="border-3 border-event-navy rounded-[var(--radius-card)] bg-event-pink/10 p-4 flex flex-col gap-2 shadow-pixel-sm">
          <div className="flex justify-between font-body text-sm text-event-navy">
            <span>{jumlahPendamping} Pendamping × Rp{BIAYA_PENDAMPING.toLocaleString('id-ID')}</span>
            <span className="font-medium">Rp{totalBiayaPendamping.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/30">
            <span>SUBTOTAL PENDAMPING</span>
            <span>Rp{totalBiayaPendamping.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <Button type="button" variant="outline" pixel onClick={onBack}>
            Kembali
          </Button>
          <Button type="submit" variant="primary" pixel disabled={!isValid}>
            Lanjut ke Review
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
