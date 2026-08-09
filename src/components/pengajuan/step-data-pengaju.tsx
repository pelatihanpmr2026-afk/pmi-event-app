'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { dataPengajuSchema, DataPengajuValues } from '@/lib/validations/pengajuan-anggaran'
import { DIVISI_OPTIONS } from '@/lib/constants'

export function StepDataPengaju({
  onComplete,
  defaultValues,
}: {
  onComplete: (values: DataPengajuValues) => void
  defaultValues?: DataPengajuValues
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DataPengajuValues>({
    resolver: zodResolver(dataPengajuSchema),
    defaultValues,
  })

  function onSubmit(values: DataPengajuValues) {
    onComplete(values)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Input
        label="Nama Koordinator"
        placeholder="Nama lengkap koordinator/pengaju"
        error={errors.namaKoordinator?.message}
        {...register('namaKoordinator')}
      />
      <Select
        label="Divisi"
        placeholder="Pilih divisi"
        options={[...DIVISI_OPTIONS]}
        error={errors.divisi?.message}
        {...register('divisi')}
      />
      <Input
        label="Nomor HP"
        placeholder="Contoh: 081234567890"
        error={errors.noHp?.message}
        {...register('noHp')}
      />
      <Button type="submit" variant="primary" className="mt-2">
        Lanjut
      </Button>
    </form>
  )
}