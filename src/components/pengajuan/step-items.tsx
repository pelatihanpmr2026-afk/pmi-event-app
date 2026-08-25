'use client'

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { Plus, Trash2, FileDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/ui/signature-pad'
import { ItemsTable } from './items-table'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  itemBarangArraySchema,
  ItemBarangValues,
  createEmptyItem,
  DataPengajuValues,
} from '@/lib/validations/pengajuan-anggaran'
import { DIVISI_OPTIONS } from '@/lib/constants'

const formSchema = z.object({ items: itemBarangArraySchema })
type FormValues = z.infer<typeof formSchema>

function formatRp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function StepItems({
  dataPengaju,
  defaultItems,
  defaultSignature,
  onItemsChange,
  onSignatureChange,
  onBack,
  onSubmitted,
}: {
  dataPengaju: DataPengajuValues
  defaultItems?: ItemBarangValues[]
  defaultSignature?: string
  onItemsChange?: (items: ItemBarangValues[]) => void
  onSignatureChange?: (signature: string | null) => void
  onBack: () => void
  onSubmitted: (pengajuanId: string) => void
}) {
  const [signature, setSignature] = useState<string | null>(defaultSignature ?? null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const isDesktop = useMediaQuery('(min-width: 768px)')

  const {
    control,
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: defaultItems?.length ? defaultItems : [createEmptyItem()] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  const totalJenisBarang = watchedItems?.length ?? 0
  const totalKuantitas = watchedItems?.reduce((sum, it) => sum + (Number(it.qty) || 0), 0) ?? 0
  const totalPengajuan =
    watchedItems?.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.hargaSatuan) || 0), 0) ?? 0

  // Sinkronkan perubahan items & tanda tangan ke parent untuk draft auto-save.
  useEffect(() => {
    if (watchedItems) onItemsChange?.(watchedItems)
  }, [watchedItems, onItemsChange])

  useEffect(() => {
    onSignatureChange?.(signature)
  }, [signature, onSignatureChange])

  async function buildFormData(items: ItemBarangValues[]) {
    const formData = new FormData()
    formData.append('dataPengaju', JSON.stringify(dataPengaju))
    formData.append('items', JSON.stringify(items))

    if (signature) {
      const res = await fetch(signature)
      const blob = await res.blob()
      formData.append('tandaTangan', blob, 'tanda-tangan.png')
    }

    return formData
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const formData = await buildFormData(values.items)
      const res = await fetch('/api/pengajuan-anggaran', { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal mengirim pengajuan')
      toast.success('Pengajuan berhasil dikirim')
      onSubmitted(result.data.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCetakPdf() {
    const parsed = formSchema.safeParse({ items: watchedItems })
    if (!parsed.success) {
      toast.error('Lengkapi data barang dengan benar dulu sebelum cetak PDF')
      return
    }

    setIsPrinting(true)
    try {
      const formData = await buildFormData(parsed.data.items)
      const res = await fetch('/api/pengajuan-anggaran/preview-pdf', { method: 'POST', body: formData })

      if (!res.ok) {
        const result = await res.json().catch(() => null)
        throw new Error(result?.message || 'Gagal membuat PDF')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="border-3 border-event-navy bg-white p-4">
        <p className="font-body text-xs text-event-navy/60">Koordinator</p>
        <p className="font-body font-bold text-sm text-event-navy">{dataPengaju.namaKoordinator}</p>
        <p className="font-body text-xs text-event-navy/60 mt-1">
          {DIVISI_OPTIONS.find((d) => d.value === dataPengaju.divisi)?.label} · {dataPengaju.noHp}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-[11px] text-event-navy">RINCIAN BARANG/KEBUTUHAN</h3>
          <button
            type="button"
            onClick={() => append(createEmptyItem())}
            className="flex items-center gap-1 px-3 py-2 bg-event-blue text-white border-3 border-event-navy font-body text-xs font-semibold"
          >
            <Plus size={12} />
            Tambah Baris
          </button>
        </div>

        {errors.items?.message && <p className="text-xs font-bold text-pmi-red">{errors.items.message}</p>}

        {/* Cuma SATU dari dua tampilan ini yang benar-benar ter-mount & register() field —
            dipilih berdasarkan lebar layar sungguhan (useMediaQuery), bukan cuma disembunyikan pakai CSS.
            Ini yang memperbaiki bug "tidak bisa ketik": sebelumnya card (mobile) & table (desktop)
            dua-duanya selalu mount dan register() ke nama field yang sama secara bersamaan. */}
        {isDesktop ? (
          <ItemsTable fields={fields} register={register} watch={watch} errors={errors} onRemove={remove} />
        ) : (
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => {
              const itemErrors = errors.items?.[index]
              const qty = Number(watchedItems?.[index]?.qty) || 0
              const harga = Number(watchedItems?.[index]?.hargaSatuan) || 0

              return (
                <div key={field.id} className="border-3 border-event-navy bg-white p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-[9px] text-event-navy/50">BARANG {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      className="w-7 h-7 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy disabled:opacity-40"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <Input
                    label="Nama Barang/Kebutuhan"
                    placeholder="Contoh: Spanduk 3x1m"
                    error={itemErrors?.namaBarang?.message}
                    {...register(`items.${index}.namaBarang`)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Qty"
                      inputMode="numeric"
                      placeholder="1"
                      error={itemErrors?.qty?.message}
                      {...register(`items.${index}.qty`)}
                    />
                    <Input
                      label="Harga Satuan (Rp)"
                      inputMode="numeric"
                      placeholder="50000"
                      error={itemErrors?.hargaSatuan?.message}
                      {...register(`items.${index}.hargaSatuan`)}
                    />
                  </div>
                  <div className="flex justify-between font-body text-xs text-event-navy">
                    <span className="text-event-navy/60">Subtotal</span>
                    <span className="font-bold">{formatRp(qty * harga)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-3 border-event-navy bg-event-yellow/20 p-4 flex flex-col gap-2">
        <div className="flex justify-between font-body text-xs text-event-navy">
          <span>Total Jenis Barang</span>
          <span className="font-bold">{totalJenisBarang}</span>
        </div>
        <div className="flex justify-between font-body text-xs text-event-navy">
          <span>Total Kuantitas</span>
          <span className="font-bold">{totalKuantitas}</span>
        </div>
        <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20">
          <span>TOTAL PENGAJUAN</span>
          <span>{formatRp(totalPengajuan)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-body font-bold text-sm text-event-navy">Tanda Tangan (Opsional)</label>
        <SignaturePad onChange={setSignature} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Kembali
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCetakPdf}
          isLoading={isPrinting}
          className="flex items-center justify-center gap-2"
        >
          <FileDown size={16} />
          Cetak Pengajuan (PDF)
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          Selesai
        </Button>
      </div>
    </form>
  )
}