'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { RadioPixel } from '@/components/ui/radio-pixel'
import { Button } from '@/components/ui/button'
import { dataSekolahMiniSchema, DataSekolahMiniValues } from '@/lib/validations/sekolah'

export function BuatSekolahBaru({ onCreated, onExisting }: { onCreated: (data: DataSekolahMiniValues) => void; onExisting: (namaSekolah: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm<DataSekolahMiniValues>({ resolver: zodResolver(dataSekolahMiniSchema) })
  async function onSubmit(values: DataSekolahMiniValues) {
    setIsSubmitting(true)
    try {
      // Cek dulu apakah sekolah dengan nama ini sudah pernah terdaftar.
      // Kalau sudah, jangan buat duplikat — arahkan ke alur Cari Sekolah
      // agar user bisa menambah sewa tenda pada sekolah yang sama.
      const res = await fetch(`/api/sekolah/check-nama?namaSekolah=${encodeURIComponent(values.namaSekolah)}`)
      const result = await res.json()
      if (result.success && result.data.status !== 'tersedia') {
        toast.error('Sekolah sudah terdaftar. Gunakan tab Cari Sekolah untuk menambah sewa tenda.')
        onExisting(result.data.namaLengkap)
        return
      }
      // Sekolah baru baru disimpan saat bukti pembayaran tenda dikirim.
      onCreated(values)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan') } finally { setIsSubmitting(false) }
  }
  return <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
    <div className="bg-event-cream border-3 border-event-navy shadow-pixel-sm p-3"><p className="font-body text-[11px] text-event-navy/70">Gunakan form ini bila sekolah/unit belum pernah terdaftar. Jika sudah ada, gunakan Cari Sekolah agar data tidak ganda.</p></div>
    <Input label="Nama Resmi Sekolah / Unit" placeholder="Contoh: SMK Kesehatan Cianjur atau Bakti Medika" error={errors.namaSekolah?.message} {...register('namaSekolah')} />
    <RadioPixel pixel label="Kategori PMR" name="kategori" options={[{ value: 'MADYA', label: 'Madya' }, { value: 'WIRA', label: 'Wira' }]} value={watch('kategori')} onChange={(val) => setValue('kategori', val as DataSekolahMiniValues['kategori'], { shouldValidate: true })} error={errors.kategori?.message} />
    <Input label="Nama Pembina/Pelatih" placeholder="Contoh: Budi Santoso" error={errors.namaPembina?.message} {...register('namaPembina')} />
    <Input label="Nomor WhatsApp Pembina/Pelatih" placeholder="Contoh: 081234567890" error={errors.noWhatsappPembina?.message} {...register('noWhatsappPembina')} />
    <Input label="Estimasi Jumlah Peserta + Pendamping" placeholder="Contoh: 30" inputMode="numeric" error={errors.estimasiPesertaPendamping?.message} {...register('estimasiPesertaPendamping')} />
    <div className="bg-event-yellow/20 border-3 border-event-navy shadow-pixel-sm p-3"><p className="font-body text-[11px] text-event-navy">Estimasi menjadi acuan minimal kapasitas tenda yang bisa disewa.</p></div>
    <Button type="submit" variant="primary" pixel isLoading={isSubmitting}>Lanjut ke Pemilihan Tenda</Button>
  </form>
}
