'use client'

import { useForm, useFieldArray, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PesertaCard } from '../peserta-card'
import { PesertaTable } from '../peserta-table'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  pesertaOnlySchema,
  PesertaOnlyValues,
  PesertaPendampingValues,
  createEmptyPeserta,
} from '@/lib/validations/peserta'
import { BIAYA_PESERTA } from '@/lib/constants-sekolah'

export function StepPeserta({
  onComplete,
  onBack,
  defaultValues,
}: {
  onComplete: (values: Pick<PesertaPendampingValues, 'peserta'>) => void
  onBack: () => void
  defaultValues?: Pick<PesertaPendampingValues, 'peserta'>
}) {
  // Step ini hanya mengurus data peserta, jadi resolver-nya juga khusus
  // schema peserta saja (pesertaOnlySchema) — lihat komentar di
  // src/lib/validations/peserta.ts untuk alasan kenapa dipisah dari
  // pesertaPendampingSchema.
  const form = useForm<PesertaOnlyValues>({
    resolver: zodResolver(pesertaOnlySchema),
    defaultValues: {
      peserta: defaultValues?.peserta ?? [createEmptyPeserta()],
    },
    mode: 'onChange',
  })

  const { control, handleSubmit, watch, formState: { errors, isValid } } = form
  const pesertaArray = useFieldArray({ control, name: 'peserta' })
  const jumlahPeserta = watch('peserta')?.length ?? 0
  const totalBiayaPeserta = jumlahPeserta * BIAYA_PESERTA

  // Tampilan mobile (card) dan desktop (table) TIDAK boleh mount bersamaan
  // karena keduanya register() ke nama field react-hook-form yang sama
  // (mis. `peserta.0.namaLengkap`). Kalau dua-duanya mount sekaligus
  // (dulu hanya disembunyikan pakai class Tailwind `md:hidden` /
  // `hidden md:block`), react-hook-form jadi bingung input mana yang jadi
  // "sumber kebenaran" untuk tiap field — akibatnya user bisa mengetik di
  // input yang terlihat, tapi value-nya tidak pernah tervalidasi/tersimpan
  // dengan benar. Solusinya: pilih salah satu tampilan berdasarkan lebar
  // layar sungguhan (useMediaQuery), sehingga hanya SATU input yang benar-
  // benar ter-mount untuk tiap field.
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    if (defaultValues) {
      form.reset({ peserta: defaultValues.peserta })
    }
  }, [defaultValues, form])

  async function onSubmit(values: PesertaOnlyValues) {
    onComplete({ peserta: values.peserta })
  }

  function handleFormError() {
    const fields = Object.keys(errors)
    if (fields.length > 0) {
      toast.error(`Mohon lengkapi data peserta. Field yang belum valid: ${fields.join(', ')}`)
    } else {
      toast.error('Terjadi kesalahan validasi')
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit, handleFormError)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-[11px] text-event-navy">DATA PESERTA</h3>
          </div>
          {errors.peserta?.message && <p className="text-xs font-medium text-pmi-red">{errors.peserta.message}</p>}

          {isDesktop ? (
            <PesertaTable fields={pesertaArray.fields} onRemove={pesertaArray.remove} />
          ) : (
            <div className="flex flex-col gap-3">
              {pesertaArray.fields.length === 0 && (
                <p className="font-body text-sm text-gray-400 text-center py-4 border border-[var(--color-border)] rounded-[var(--radius-input)]">
                  Belum ada peserta ditambahkan
                </p>
              )}
              {pesertaArray.fields.map((field, index) => (
                <PesertaCard
                  key={field.id}
                  index={index}
                  canRemove={pesertaArray.fields.length > 1}
                  onRemove={() => pesertaArray.remove(index)}
                />
              ))}
            </div>
          )}

          {/* Tombol Tambah Peserta */}
          <button
            type="button"
            onClick={() => pesertaArray.append(createEmptyPeserta())}
            className="flex items-center justify-center gap-1 py-3 bg-event-blue text-white border-3 border-event-navy shadow-pixel rounded-[var(--radius-btn)] text-xs font-medium hover:bg-event-blue-dark transition-all md:w-48 md:self-end mt-2"
          >
            <Plus size={16} />
            Tambah Peserta
          </button>
        </div>

        {/* Ringkasan Biaya */}
        <div className="border-3 border-event-navy rounded-[var(--radius-card)] bg-event-yellow/10 p-4 flex flex-col gap-2 shadow-pixel-sm">
          <div className="flex justify-between font-body text-sm text-event-navy">
            <span>{jumlahPeserta} Peserta × Rp{BIAYA_PESERTA.toLocaleString('id-ID')}</span>
            <span className="font-medium">Rp{totalBiayaPeserta.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/30">
            <span>SUBTOTAL PESERTA</span>
            <span>Rp{totalBiayaPeserta.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <Button type="button" variant="outline" pixel onClick={onBack}>
            Kembali
          </Button>
          <Button type="submit" variant="primary" pixel disabled={!isValid}>
            Lanjut ke Pendamping
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
