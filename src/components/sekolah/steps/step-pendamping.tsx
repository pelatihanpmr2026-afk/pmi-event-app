'use client'

import { useForm, useFieldArray, FormProvider, type FieldErrors, type FieldPath } from 'react-hook-form'
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

// Urutan navigasi field saat klik "Lanjut" dengan data invalid (lihat
// komentar yang sama di step-peserta.tsx).
const PENDAMPING_FIELDS = [
  'namaLengkap',
  'tempatLahir',
  'tanggalLahir',
  'alamat',
  'agama',
  'golonganDarah',
  'tahunMasuk',
  'noHp',
  'gender',
] as const

type PendampingFieldKey = (typeof PENDAMPING_FIELDS)[number]

const PENDAMPING_FIELD_LABELS: Record<PendampingFieldKey, string> = {
  namaLengkap: 'Nama Lengkap',
  tempatLahir: 'Tempat Lahir',
  tanggalLahir: 'Tanggal Lahir',
  alamat: 'Alamat',
  agama: 'Agama',
  golonganDarah: 'Golongan Darah',
  tahunMasuk: 'Tahun Masuk',
  noHp: 'No. HP',
  gender: 'Jenis Kelamin',
}

function scrollToItem(prefix: string, index: number) {
  const candidates = [`[name="${prefix}.${index}.namaLengkap"]`, `[name^="${prefix}.${index}."]`]
  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
  }
}

export function StepPendamping({
  onComplete,
  onBack,
  onSaveDraft,
  defaultValues,
}: {
  onComplete: (values: Pick<PesertaPendampingValues, 'pendamping'>) => void
  onBack: () => void
  onSaveDraft?: (values: Pick<PesertaPendampingValues, 'pendamping'>) => void
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

  const { control, handleSubmit, watch, getValues } = form
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

  // Klik "Lanjut" SELALU aktif (validasi penuh tetap berjalan di handleSubmit).
// Callback error ini adalah sumber kebenaran saat tombol diklik: cari
// pendamping & field pertama yang invalid, fokus ke input-nya (input
// native), scroll ke kartu/baris-nya, lalu tampilkan pesan presisi.
function handleFormError(formErrors: FieldErrors<PendampingOnlyValues>) {
  const items = formErrors.pendamping as unknown as
    | Array<Record<PendampingFieldKey, { message?: string } | undefined>>
    | undefined
  const arrayMessage =
    (formErrors.pendamping as unknown as { message?: string } | undefined)?.message ?? null

  // Pendamping opsional: array kosong = valid. Kalau ada error level array
  // (tidak mungkin normal, tapi jaga-jaga) tampilkan apa adanya.
  if (!Array.isArray(items) || items.length === 0) {
    toast.error(arrayMessage || 'Terjadi kesalahan validasi')
    return
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item) continue
    for (const field of PENDAMPING_FIELDS) {
      const fieldError = item[field]
      if (!fieldError?.message) continue

      const name = `pendamping.${i}.${field}`
      const label = PENDAMPING_FIELD_LABELS[field]

      // gender (RadioPixel) tidak punya input native → hanya scroll + toast.
      if (field !== 'gender') {
        form.setFocus(name as FieldPath<PendampingOnlyValues>)
      }
      const el = document.querySelector<HTMLElement>(`[name="${name}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        scrollToItem('pendamping', i)
      }

      toast.error(`Pendamping #${i + 1} belum lengkap — ${label}: ${fieldError.message}`)
      return
    }
  }
  toast.error('Terjadi kesalahan validasi')
}

  function handleSaveDraft() {
    onSaveDraft?.({ pendamping: getValues().pendamping })
  }

  // Klik "Kembali" juga menyimpan draft dulu — tanpa itu, data pendamping
  // yang baru diketik ikut terhapus saat StepPendamping di-unmount.
  function handleBack() {
    if (onSaveDraft) {
      onSaveDraft({ pendamping: getValues().pendamping })
    }
    onBack()
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" pixel onClick={handleBack}>
            Kembali
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {onSaveDraft && (
              <Button type="button" variant="secondary" pixel onClick={handleSaveDraft}>
                Simpan Draft & Lanjut Nanti
              </Button>
            )}
            <Button type="submit" variant="primary" pixel>
              Lanjut ke Review
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}
