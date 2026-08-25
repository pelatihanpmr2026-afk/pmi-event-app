'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import NextLink from 'next/link'
import { CheckCircle2, XCircle, Loader2, Link2, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { RadioPixel } from '@/components/ui/radio-pixel'
import { Button } from '@/components/ui/button'
import { dataSekolahSchema, DataSekolahValues } from '@/lib/validations/sekolah'
import { BIAYA_PENDAMPING, BIAYA_PESERTA } from '@/lib/constants-sekolah'

export interface DataSekolahResult extends DataSekolahValues {
  namaLengkap: string
  existingSekolahId?: string
}

type CheckStatus = 'idle' | 'checking' | 'tersedia' | 'terpakai_lengkap' | 'terpakai_tenda_saja' | 'error'

export function StepDataSekolah({ onComplete, defaultValues }: { onComplete: (result: DataSekolahResult) => void; defaultValues?: DataSekolahResult }) {
  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm<DataSekolahValues>({
    resolver: zodResolver(dataSekolahSchema), mode: 'onChange', defaultValues,
  })
  const namaSekolah = watch('namaSekolah')
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [namaLengkap, setNamaLengkap] = useState(defaultValues?.namaLengkap ?? '')
  const [existingSekolahId, setExistingSekolahId] = useState<string | undefined>(defaultValues?.existingSekolahId)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setExistingSekolahId(undefined)
    if (!namaSekolah || namaSekolah.trim().length < 2) { setCheckStatus('idle'); return }
    debounceRef.current = setTimeout(async () => {
      setCheckStatus('checking')
      try {
        const res = await fetch(`/api/sekolah/check-nama?${new URLSearchParams({ namaSekolah: namaSekolah.trim() })}`)
        const result = await res.json()
        if (!res.ok) throw new Error(result?.message)
        setNamaLengkap(result.data.namaLengkap)
        setCheckStatus(result.data.status)
        if (result.data.status === 'terpakai_tenda_saja') {
          setExistingSekolahId(result.data.sekolahId)
          setValue('namaPembina', result.data.namaPembina ?? '')
          setValue('noWhatsappPembina', result.data.noWhatsappPembina ?? '')
        }
      } catch { setCheckStatus('error') }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [namaSekolah, setValue])

  function onSubmit(values: DataSekolahValues) {
    if (checkStatus === 'tersedia' || checkStatus === 'terpakai_tenda_saja') onComplete({ ...values, namaLengkap, existingSekolahId })
  }
  const bisaLanjut = checkStatus === 'tersedia' || checkStatus === 'terpakai_tenda_saja'

  return <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
    <Input label="Nama Resmi Sekolah / Unit" placeholder="Contoh: SMK Kesehatan Cianjur atau Bakti Medika" error={errors.namaSekolah?.message} {...register('namaSekolah')} />
    <RadioPixel pixel label="Kategori PMR" name="kategori" options={[{ value: 'MADYA', label: 'Madya' }, { value: 'WIRA', label: 'Wira' }]} value={watch('kategori')} onChange={(val) => setValue('kategori', val as DataSekolahValues['kategori'], { shouldValidate: true })} error={errors.kategori?.message} />
    {namaSekolah && namaSekolah.trim().length >= 2 && <div className={`border-3 p-3 flex items-center gap-2 shadow-pixel-sm ${checkStatus === 'tersedia' ? 'border-green-600 bg-green-50' : checkStatus === 'terpakai_tenda_saja' ? 'border-event-blue bg-event-blue/10' : checkStatus === 'terpakai_lengkap' ? 'border-pmi-red bg-pmi-red/10' : 'border-event-navy bg-event-cream'}`}>
      {checkStatus === 'checking' && <Loader2 size={16} className="animate-spin text-event-navy/50 shrink-0" />}{checkStatus === 'tersedia' && <CheckCircle2 size={16} className="text-green-600 shrink-0" />}{checkStatus === 'terpakai_tenda_saja' && <Link2 size={16} className="text-event-blue shrink-0" />}{checkStatus === 'terpakai_lengkap' && <XCircle size={16} className="text-pmi-red shrink-0" />}
      <p className="font-body text-xs text-event-navy">{checkStatus === 'checking' && 'Mengecek ketersediaan nama sekolah...'}{checkStatus === 'tersedia' && <>Nama resmi: <span className="font-bold">{namaLengkap}</span> — tersedia</>}{checkStatus === 'terpakai_tenda_saja' && <><span className="font-bold">{namaLengkap}</span> sudah pernah menyewa tenda. Pendaftaran akan disambungkan ke sekolah tersebut.</>}{checkStatus === 'terpakai_lengkap' && <><span className="font-bold">{namaLengkap}</span> sudah terdaftar sebelumnya.</>}{checkStatus === 'error' && 'Gagal mengecek nama sekolah, coba lagi.'}</p>
    </div>}
    {checkStatus === 'terpakai_lengkap' && <NextLink href="/sekolah/susulan" className="flex items-center justify-center gap-2 border-3 border-event-navy bg-event-yellow shadow-pixel-sm px-4 py-3 font-body font-bold text-xs text-event-navy hover:bg-event-yellow/80 transition-colors">Daftarkan Peserta/Pendamping Susulan untuk Sekolah Ini <ArrowRight size={14} /></NextLink>}
    <Input label="Nama Pembina/Pelatih" placeholder="Contoh: Budi Santoso" error={errors.namaPembina?.message} {...register('namaPembina')} />
    <Input label="Nomor WhatsApp Aktif Pembina/Pelatih" placeholder="Contoh: 081234567890" error={errors.noWhatsappPembina?.message} {...register('noWhatsappPembina')} />
    <div className="bg-event-cream border-3 border-event-navy shadow-pixel-sm p-4"><p className="font-body text-xs text-event-navy/70">Biaya pendaftaran: <span className="font-bold">Rp{BIAYA_PESERTA.toLocaleString('id-ID')}/peserta</span> dan <span className="font-bold">Rp{BIAYA_PENDAMPING.toLocaleString('id-ID')}/pendamping</span>.</p></div>
    <Button type="submit" variant="primary" pixel disabled={!bisaLanjut} className="mt-2">Lanjut</Button>
  </form>
}
