'use client'

import { UseFormReturn } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RadioPixel } from '@/components/ui/radio-pixel'
import { AGAMA_OPTIONS, GOLONGAN_DARAH_OPTIONS } from '@/lib/constants-sekolah'
import { GENDER_OPTIONS } from '@/lib/constants'
import { PesertaPendampingValues } from '@/lib/validations/peserta'

export function PendampingCard({
  form,
  index,
  onRemove,
}: {
  form: UseFormReturn<PesertaPendampingValues>
  index: number
  onRemove: () => void
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const itemErrors = errors.pendamping?.[index]
  const gender = watch(`pendamping.${index}.gender`)

  return (
    <div className="border-3 border-event-navy bg-white p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-heading text-[10px] text-event-navy">PENDAMPING #{index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <Input
        label="Nama Lengkap"
        placeholder="Nama sesuai identitas"
        error={itemErrors?.namaLengkap?.message}
        {...register(`pendamping.${index}.namaLengkap`)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Tempat Lahir"
          placeholder="Contoh: Cianjur"
          error={itemErrors?.tempatLahir?.message}
          {...register(`pendamping.${index}.tempatLahir`)}
        />
        <Input
          label="Tanggal Lahir"
          type="date"
          error={itemErrors?.tanggalLahir?.message}
          {...register(`pendamping.${index}.tanggalLahir`)}
        />
      </div>

      <Input
        label="Alamat Lengkap"
        placeholder="Alamat domisili"
        error={itemErrors?.alamat?.message}
        {...register(`pendamping.${index}.alamat`)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Agama"
          placeholder="Pilih agama"
          options={[...AGAMA_OPTIONS]}
          error={itemErrors?.agama?.message}
          {...register(`pendamping.${index}.agama`)}
        />
        <Select
          label="Golongan Darah"
          placeholder="Pilih gol. darah"
          options={[...GOLONGAN_DARAH_OPTIONS]}
          error={itemErrors?.golonganDarah?.message}
          {...register(`pendamping.${index}.golonganDarah`)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Tahun Masuk"
          placeholder="Contoh: 2024"
          inputMode="numeric"
          error={itemErrors?.tahunMasuk?.message}
          {...register(`pendamping.${index}.tahunMasuk`)}
        />
        <Input
          label="No. HP (Opsional)"
          placeholder="Boleh dikosongkan"
          error={itemErrors?.noHp?.message}
          {...register(`pendamping.${index}.noHp`)}
        />
      </div>

      <RadioPixel
        label="Jenis Kelamin"
        name={`pendamping.${index}.gender`}
        options={GENDER_OPTIONS}
        value={gender}
        onChange={(val) =>
          setValue(
            `pendamping.${index}.gender`,
            val as PesertaPendampingValues['pendamping'][number]['gender'],
            { shouldValidate: true }
          )
        }
        error={itemErrors?.gender?.message}
      />
    </div>
  )
}