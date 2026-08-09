'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, XCircle, Loader2, Link2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RadioPixel } from '@/components/ui/radio-pixel'
import { Button } from '@/components/ui/button'
import { JENJANG_OPTIONS, STATUS_SEKOLAH_OPTIONS } from '@/lib/constants-sekolah'
import { dataSekolahSchema, DataSekolahValues } from '@/lib/validations/sekolah'
import { stripRedundantPrefix } from '@/lib/sekolah'

export interface DataSekolahResult extends DataSekolahValues {
  namaLengkap: string
  existingSekolahId?: string
}

type CheckStatus =
  | 'idle'
  | 'checking'
  | 'tersedia'
  | 'terpakai_lengkap'
  | 'terpakai_tenda_saja'
  | 'error'

export function StepDataSekolah({
  onComplete,
  defaultValues,
}: {
  onComplete: (result: DataSekolahResult) => void
  defaultValues?: DataSekolahResult
}) {
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<DataSekolahValues>({
    resolver: zodResolver(dataSekolahSchema),
    mode: 'onChange',
    defaultValues,
  })

  const jenjang = watch('jenjang')
  const statusSekolah = watch('statusSekolah')
  const namaInput = watch('namaInput')

  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [namaLengkap, setNamaLengkap] = useState(defaultValues?.namaLengkap ?? '')
  const [existingSekolahId, setExistingSekolahId] = useState<string | undefined>(
    defaultValues?.existingSekolahId
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasRedundantPrefix =
    !!namaInput && stripRedundantPrefix(namaInput) !== namaInput.trim().replace(/\s+/g, ' ')

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setExistingSekolahId(undefined)

    if (!jenjang || !statusSekolah || !namaInput || namaInput.trim().length < 2) {
      return
    }

    debounceRef.current = setTimeout(async () => {
      setCheckStatus('checking')
      try {
        const params = new URLSearchParams({ jenjang, statusSekolah, namaInput: namaInput.trim() })
        const res = await fetch(`/api/sekolah/check-nama?${params.toString()}`)
        const result = await res.json()

        if (!res.ok) throw new Error(result?.message || 'Gagal cek nama sekolah')

        setNamaLengkap(result.data.namaLengkap)
        setCheckStatus(result.data.status)

        if (result.data.status === 'terpakai_tenda_saja') {
          setExistingSekolahId(result.data.sekolahId)
          setValue('namaPembina', result.data.namaPembina ?? '')
          setValue('noWhatsappPembina', result.data.noWhatsappPembina ?? '')
        }
      } catch {
        setCheckStatus('error')
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [jenjang, statusSekolah, namaInput, setValue])

  function onSubmit(values: DataSekolahValues) {
    if (checkStatus !== 'tersedia' && checkStatus !== 'terpakai_tenda_saja') return
    onComplete({ ...values, namaLengkap, existingSekolahId })
  }

  const kategoriPreview = jenjang === 'SMP' || jenjang === 'MTS' ? 'Madya' : jenjang ? 'Wira' : null
  const bisaLanjut = checkStatus === 'tersedia' || checkStatus === 'terpakai_tenda_saja'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Jenjang"
          placeholder="Pilih jenjang"
          options={[...JENJANG_OPTIONS]}
          error={errors.jenjang?.message}
          {...register('jenjang')}
        />
        <RadioPixel
          label="Status"
          name="statusSekolah"
          options={STATUS_SEKOLAH_OPTIONS}
          value={watch('statusSekolah')}
          onChange={(val) =>
            setValue('statusSekolah', val as DataSekolahValues['statusSekolah'], {
              shouldValidate: true,
            })
          }
          error={errors.statusSekolah?.message}
        />
      </div>

      {kategoriPreview && (
        <p className="font-body text-xs text-event-navy/60">
          Kategori otomatis: <span className="font-bold text-event-navy">{kategoriPreview}</span>
        </p>
      )}

      <Input
        label="Nama Sekolah"
        placeholder="Contoh: 1 Cianjur (tanpa perlu tulis SMAN/SMKN dst)"
        error={errors.namaInput?.message}
        {...register('namaInput')}
      />

      {hasRedundantPrefix && (
        <p className="font-body text-[11px] text-event-navy/60 -mt-3">
          💡 Kata jenjang/status yang kamu ketik akan diabaikan otomatis — cukup tulis bagian
          pembeda saja (nama/nomor/lokasi sekolahnya).
        </p>
      )}

      {namaInput && namaInput.trim().length >= 2 && jenjang && statusSekolah && (
        <div
          className={`border-3 p-3 flex items-center gap-2 ${
            checkStatus === 'tersedia'
              ? 'border-green-600 bg-green-50'
              : checkStatus === 'terpakai_tenda_saja'
                ? 'border-event-blue bg-event-blue/10'
                : checkStatus === 'terpakai_lengkap'
                  ? 'border-pmi-red bg-pmi-red/10'
                  : 'border-event-navy/30 bg-event-cream'
          }`}
        >
          {checkStatus === 'checking' && (
            <Loader2 size={16} className="animate-spin text-event-navy/50 shrink-0" />
          )}
          {checkStatus === 'tersedia' && (
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          )}
          {checkStatus === 'terpakai_tenda_saja' && (
            <Link2 size={16} className="text-event-blue shrink-0" />
          )}
          {checkStatus === 'terpakai_lengkap' && <XCircle size={16} className="text-pmi-red shrink-0" />}

          <p className="font-body text-xs text-event-navy">
            {checkStatus === 'checking' && 'Mengecek ketersediaan nama sekolah...'}
            {checkStatus === 'tersedia' && (
              <>
                Nama resmi: <span className="font-bold">{namaLengkap}</span> — tersedia
              </>
            )}
            {checkStatus === 'terpakai_tenda_saja' && (
              <>
                <span className="font-bold">{namaLengkap}</span> sudah pernah menyewa tenda
                sebelumnya (belum ada data peserta). Data pendaftaran ini akan{' '}
                <span className="font-bold">disambungkan</span> ke sekolah tersebut — isian nama
                pembina di bawah otomatis terisi, silakan koreksi kalau perlu.
              </>
            )}
            {checkStatus === 'terpakai_lengkap' && (
              <>
                <span className="font-bold">{namaLengkap}</span> sudah terdaftar lengkap
                sebelumnya. Kalau ini memang sekolahmu, hubungi panitia.
              </>
            )}
            {checkStatus === 'error' && 'Gagal mengecek nama sekolah, coba lagi.'}
          </p>
        </div>
      )}

      <Input
        label="Nama Pembina/Pelatih"
        placeholder="Contoh: Budi Santoso"
        error={errors.namaPembina?.message}
        {...register('namaPembina')}
      />

      <Input
        label="Nomor WhatsApp Aktif Pembina/Pelatih"
        placeholder="Contoh: 081234567890"
        error={errors.noWhatsappPembina?.message}
        {...register('noWhatsappPembina')}
      />

      <div className="bg-event-cream border-3 border-event-navy p-4">
        <p className="font-body text-xs text-event-navy/70">
          💰 Biaya pendaftaran: <span className="font-bold">Rp35.000/peserta</span> dan{' '}
          <span className="font-bold">Rp25.000/pendamping</span>. Total akan dihitung otomatis
          setelah kamu mengisi data peserta & pendamping di step berikutnya.
        </p>
      </div>

      <Button type="submit" variant="primary" disabled={!bisaLanjut} className="mt-2">
        Lanjut
      </Button>
    </form>
  )
}