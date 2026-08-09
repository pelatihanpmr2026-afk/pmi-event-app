'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RadioPixel } from '@/components/ui/radio-pixel'
import { Button } from '@/components/ui/button'
import { JENJANG_OPTIONS, STATUS_SEKOLAH_OPTIONS } from '@/lib/constants-sekolah'
import { dataSekolahMiniSchema, DataSekolahMiniValues } from '@/lib/validations/sekolah'

export function BuatSekolahBaru({ onCreated }: { onCreated: (sekolahId: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<DataSekolahMiniValues>({
    resolver: zodResolver(dataSekolahMiniSchema),
  })

  async function onSubmit(values: DataSekolahMiniValues) {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/sekolah/mini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan data sekolah')

      toast.success('Sekolah berhasil didaftarkan sementara')
      onCreated(result.data.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="bg-event-cream border-3 border-event-navy p-3">
        <p className="font-body text-[11px] text-event-navy/70">
          💡 Gunakan form ini kalau sekolahmu belum pernah mendaftar sama sekali. Kalau sudah pernah
          daftar peserta sebelumnya, gunakan tab Cari `&ldquo;`Sekolah`&ldquo;` agar tidak terjadi dobel data.
        </p>
      </div>

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
            setValue('statusSekolah', val as DataSekolahMiniValues['statusSekolah'], {
              shouldValidate: true,
            })
          }
          error={errors.statusSekolah?.message}
        />
      </div>

      <Input
        label="Nama Sekolah"
        placeholder="Contoh: 1 Cianjur"
        error={errors.namaInput?.message}
        {...register('namaInput')}
      />

      <Input
        label="Nama Pembina/Pelatih"
        placeholder="Contoh: Budi Santoso"
        error={errors.namaPembina?.message}
        {...register('namaPembina')}
      />

      <Input
        label="Nomor WhatsApp Pembina/Pelatih"
        placeholder="Contoh: 081234567890"
        error={errors.noWhatsappPembina?.message}
        {...register('noWhatsappPembina')}
      />

      <Input
        label="Estimasi Jumlah Peserta + Pendamping"
        placeholder="Contoh: 30"
        inputMode="numeric"
        error={errors.estimasiPesertaPendamping?.message}
        {...register('estimasiPesertaPendamping')}
      />

      <div className="bg-event-yellow/20 border-3 border-event-navy p-3">
        <p className="font-body text-[11px] text-event-navy">
          ⚠️ Estimasi ini akan jadi acuan minimal kapasitas tenda yang bisa kamu sewa, walau nanti
          jumlah peserta asli yang didaftarkan lebih sedikit.
        </p>
      </div>

      <Button type="submit" variant="primary" isLoading={isSubmitting}>
        Lanjut ke Pemilihan Tenda
      </Button>
    </form>
  )
}