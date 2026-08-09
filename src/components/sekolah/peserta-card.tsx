'use client'

import { UseFormReturn } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RadioPixel } from '@/components/ui/radio-pixel'
import { ParticipantPhotoUpload } from './participant-photo-upload'
import { AGAMA_OPTIONS, GOLONGAN_DARAH_OPTIONS, RIWAYAT_PENYAKIT_OPTIONS } from '@/lib/constants-sekolah'
import { GENDER_OPTIONS } from '@/lib/constants'
import { PesertaPendampingValues } from '@/lib/validations/peserta'


export function PesertaCard({
  form,
  index,
  onRemove,
  canRemove,
}: {
  form: UseFormReturn<PesertaPendampingValues>
  index: number
  onRemove: () => void
  canRemove: boolean
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const itemErrors = errors.peserta?.[index]
  const foto = watch(`peserta.${index}.foto`)
  const gender = watch(`peserta.${index}.gender`)

  return (
    <div className="border-3 border-event-navy bg-white p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-heading text-[10px] text-event-navy">PESERTA #{index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="flex gap-4">
        <ParticipantPhotoUpload
          value={foto}
          onChange={(file) =>
            setValue(`peserta.${index}.foto`, file as File, { shouldValidate: true })
          }
          error={itemErrors?.foto?.message as string | undefined}
        />
        <div className="flex-1 min-w-0">
          <Input
            label="Nama Lengkap"
            placeholder="Nama sesuai identitas"
            error={itemErrors?.namaLengkap?.message}
            {...register(`peserta.${index}.namaLengkap`)}
          />
        </div>
      </div>


      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Tempat Lahir"
          placeholder="Contoh: Cianjur"
          error={itemErrors?.tempatLahir?.message}
          {...register(`peserta.${index}.tempatLahir`)}
        />
        <Input
          label="Tanggal Lahir"
          type="date"
          error={itemErrors?.tanggalLahir?.message}
          {...register(`peserta.${index}.tanggalLahir`)}
        />
      </div>

      <Input
        label="Alamat Lengkap"
        placeholder="Alamat domisili"
        error={itemErrors?.alamat?.message}
        {...register(`peserta.${index}.alamat`)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Agama"
          placeholder="Pilih agama"
          options={[...AGAMA_OPTIONS]}
          error={itemErrors?.agama?.message}
          {...register(`peserta.${index}.agama`)}
        />
        <Select
          label="Golongan Darah"
          placeholder="Pilih gol. darah"
          options={[...GOLONGAN_DARAH_OPTIONS]}
          error={itemErrors?.golonganDarah?.message}
          {...register(`peserta.${index}.golonganDarah`)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Tahun Masuk"
          placeholder="Contoh: 2024"
          inputMode="numeric"
          error={itemErrors?.tahunMasuk?.message}
          {...register(`peserta.${index}.tahunMasuk`)}
        />
        <Input
          label="No. HP (Opsional)"
          placeholder="Boleh dikosongkan"
          error={itemErrors?.noHp?.message}
          {...register(`peserta.${index}.noHp`)}
        />
      </div>

     <RadioPixel
        label="Jenis Kelamin"
        name={`peserta.${index}.gender`}
        options={GENDER_OPTIONS}
        value={gender}
        onChange={(val) =>
          setValue(`peserta.${index}.gender`, val as PesertaPendampingValues['peserta'][number]['gender'], {
            shouldValidate: true,
          })
        }
        error={itemErrors?.gender?.message}
      />

      <Select
        label="Riwayat Penyakit"
        placeholder="Pilih riwayat penyakit"
        options={[...RIWAYAT_PENYAKIT_OPTIONS]}
        error={itemErrors?.riwayatPenyakit?.message as string | undefined}
        {...register(`peserta.${index}.riwayatPenyakit`)}
      />
    </div>
  )
}