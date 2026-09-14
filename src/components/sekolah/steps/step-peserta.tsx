'use client'

import { useForm, useFieldArray, FormProvider, type FieldErrors, type FieldPath } from 'react-hook-form'
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

// Urutan navigasi field saat klik "Lanjut" dengan data invalid: field yang
// muncul lebih dulu di kartu/baris diperiksa lebih dulu, agar user selalu
// diarahkan ke masalah pertama yang harus diperbaiki.
const PESERTA_FIELDS = [
  'foto',
  'namaLengkap',
  'tempatLahir',
  'tanggalLahir',
  'alamat',
  'agama',
  'golonganDarah',
  'tahunMasuk',
  'noHp',
  'gender',
  'riwayatPenyakit',
] as const

type PesertaFieldKey = (typeof PESERTA_FIELDS)[number]

const PESERTA_FIELD_LABELS: Record<PesertaFieldKey, string> = {
  foto: 'Foto',
  namaLengkap: 'Nama Lengkap',
  tempatLahir: 'Tempat Lahir',
  tanggalLahir: 'Tanggal Lahir',
  alamat: 'Alamat',
  agama: 'Agama',
  golonganDarah: 'Golongan Darah',
  tahunMasuk: 'Tahun Masuk',
  noHp: 'No. HP',
  gender: 'Jenis Kelamin',
  riwayatPenyakit: 'Riwayat Penyakit',
}

// RadioPixel "Jenis Kelamin" dan upload foto tidak mendaftarkan input native
// ke react-hook-form, jadi setFocus tidak bisa dilakukan — cukup scroll ke
// kartu/baris + toast spesifik (error-nya sudah terlihat merah di kartu).
export function scrollToItem(prefix: string, index: number) {
  const candidates = [`[name="${prefix}.${index}.namaLengkap"]`, `[name^="${prefix}.${index}."]`]
  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
  }
}

export function StepPeserta({
  onComplete,
  onBack,
  onSaveDraft,
  defaultValues,
}: {
  onComplete: (values: Pick<PesertaPendampingValues, 'peserta'>) => void
  onBack: () => void
  onSaveDraft?: (values: Pick<PesertaPendampingValues, 'peserta'>) => void
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

  const { control, handleSubmit, watch, getValues, formState: { errors } } = form
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

  // Klik "Lanjut" SELALU aktif (validasi penuh tetap berjalan di handleSubmit).
// Callback error ini adalah sumber kebenaran saat tombol diklik: cari peserta
// & field pertama yang invalid, fokus ke input-nya (input native), scroll ke
// kartu/baris-nya, lalu tampilkan pesan presisi.
function handleFormError(formErrors: FieldErrors<PesertaOnlyValues>) {
  const items = formErrors.peserta as unknown as
    | Array<Record<PesertaFieldKey, { message?: string } | undefined>>
    | undefined
  const arrayMessage =
    (formErrors.peserta as unknown as { message?: string } | undefined)?.message ?? null

  if (!Array.isArray(items) || items.length === 0) {
    toast.error(arrayMessage || 'Terjadi kesalahan validasi')
    return
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item) continue
    for (const field of PESERTA_FIELDS) {
      const fieldError = item[field]
      if (!fieldError?.message) continue

      const name = `peserta.${i}.${field}`
      const label = PESERTA_FIELD_LABELS[field]

      // Field yang punya input native (text/date/select) bisa di-fokus;
      // gender (RadioPixel) & foto hanya di-scroll + toast.
      if (field !== 'gender' && field !== 'foto') {
        form.setFocus(name as FieldPath<PesertaOnlyValues>)
      }
      const el = document.querySelector<HTMLElement>(`[name="${name}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        scrollToItem('peserta', i)
      }

      toast.error(`Peserta #${i + 1} belum lengkap — ${label}: ${fieldError.message}`)
      return
    }
  }
  toast.error('Terjadi kesalahan validasi')
}

  function handleSaveDraft() {
    onSaveDraft?.({ peserta: getValues().peserta })
  }

  // Klik "Kembali" juga menyimpan draft dulu — tanpa itu, data peserta yang
  // baru diketik ikut terhapus karena StepPeserta di-unmount saat pindah step.
  function handleBack() {
    if (onSaveDraft) {
      onSaveDraft({ peserta: getValues().peserta })
    }
    onBack()
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
              Lanjut ke Pendamping
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}
