'use client'

import { UseFormReturn } from 'react-hook-form'
import Image from 'next/image'
import { useRef, useMemo, useEffect } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { AGAMA_OPTIONS, GOLONGAN_DARAH_OPTIONS, RIWAYAT_PENYAKIT_OPTIONS } from '@/lib/constants-sekolah'
import { GENDER_OPTIONS } from '@/lib/constants'
import { PesertaPendampingValues } from '@/lib/validations/peserta'

const cellInputClass = 'w-full px-2.5 py-2.5 text-sm'
const cellLabelClass = 'font-body text-[10px] font-bold text-event-navy/50 mb-1 block'

function FotoCell({
  value,
  onChange,
  error,
}: {
  value: File | undefined
  onChange: (file: File | undefined) => void
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const preview = useMemo(() => {
    if (value instanceof File) return URL.createObjectURL(value)
    return null
  }, [value])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  return (
    <div className="flex flex-col items-center gap-1">
      <label
        className={`relative w-16 h-16 border-3 flex items-center justify-center cursor-pointer overflow-hidden shrink-0 ${
          error ? 'border-pmi-red' : 'border-event-navy'
        }`}
      >
        {preview ? (
          <Image src={preview} alt="Foto" fill className="object-cover" />
        ) : (
          <Upload size={18} className="text-event-navy/40" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onChange(file)
          }}
        />
      </label>
      {error && <span className="text-[10px] font-bold text-pmi-red">Wajib</span>}
    </div>
  )
}

export function PesertaTable({
  form,
  fields,
  onRemove,
}: {
  form: UseFormReturn<PesertaPendampingValues>
  fields: { id: string }[]
  onRemove: (index: number) => void
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  return (
    <div className="border-3 border-event-navy bg-white">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: '1600px' }}>
          <thead>
            <tr className="bg-event-navy text-white">
              <th className="font-body text-xs px-2 py-3 w-12">No</th>
              <th className="font-body text-xs px-2 py-3 w-24">Foto</th>
              <th className="font-body text-xs px-2 py-3 text-left w-48">Nama Lengkap</th>
              <th className="font-body text-xs px-2 py-3 text-left w-56">Tempat & Tanggal Lahir</th>
              <th className="font-body text-xs px-2 py-3 text-left w-56">Alamat</th>
              <th className="font-body text-xs px-2 py-3 text-left w-48">Agama & Gol. Darah</th>
              <th className="font-body text-xs px-2 py-3 text-left w-28">Tahun Masuk</th>
              <th className="font-body text-xs px-2 py-3 text-left w-48">No. HP & Gender</th>
              <th className="font-body text-xs px-2 py-3 text-left w-52">Riwayat Penyakit</th>
              <th className="font-body text-xs px-2 py-3 w-16">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const itemErrors = errors.peserta?.[index]
              const foto = watch(`peserta.${index}.foto`)

              return (
                <tr
                  key={field.id}
                  className={`border-t-2 border-event-navy/10 align-top ${index % 2 === 1 ? 'bg-event-cream/40' : ''}`}
                >
                  <td className="text-center font-body text-sm text-event-navy/60 py-4">
                    {index + 1}
                  </td>
                  <td className="p-2">
                  <FotoCell
                    value={foto}
                    onChange={(file) =>
                      setValue(`peserta.${index}.foto`, file as File, { shouldValidate: true })
                    }
                    error={itemErrors?.foto?.message as string | undefined}
                  />
                </td>
                 <td className="p-2">
                    <Input
                      className={cellInputClass}
                      error={itemErrors?.namaLengkap?.message}
                      {...register(`peserta.${index}.namaLengkap`)}
                    />
                  </td>
                  <td className="p-2">
                    <span className={cellLabelClass}>Tempat Lahir</span>
                    <Input
                      className={`${cellInputClass} mb-2`}
                      error={itemErrors?.tempatLahir?.message}
                      {...register(`peserta.${index}.tempatLahir`)}
                    />
                    <span className={cellLabelClass}>Tanggal Lahir</span>
                    <Input
                      type="date"
                      className={cellInputClass}
                      error={itemErrors?.tanggalLahir?.message}
                      {...register(`peserta.${index}.tanggalLahir`)}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      className={cellInputClass}
                      error={itemErrors?.alamat?.message}
                      {...register(`peserta.${index}.alamat`)}
                    />
                  </td>
                  <td className="p-2">
                    <span className={cellLabelClass}>Agama</span>
                    <Select
                      className={`${cellInputClass} mb-2`}
                      placeholder="Pilih agama"
                      options={[...AGAMA_OPTIONS]}
                      error={itemErrors?.agama?.message}
                      {...register(`peserta.${index}.agama`)}
                    />
                    <span className={cellLabelClass}>Golongan Darah</span>
                    <Select
                      className={cellInputClass}
                      placeholder="Pilih gol. darah"
                      options={[...GOLONGAN_DARAH_OPTIONS]}
                      error={itemErrors?.golonganDarah?.message}
                      {...register(`peserta.${index}.golonganDarah`)}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      className={cellInputClass}
                      inputMode="numeric"
                      placeholder="2024"
                      error={itemErrors?.tahunMasuk?.message}
                      {...register(`peserta.${index}.tahunMasuk`)}
                    />
                  </td>
                 <td className="p-2">
                    <span className={cellLabelClass}>No. HP (Opsional)</span>
                    <Input
                      className={`${cellInputClass} mb-2`}
                      error={itemErrors?.noHp?.message}
                      {...register(`peserta.${index}.noHp`)}
                    />
                    <span className={cellLabelClass}>Jenis Kelamin</span>
                    <Select
                      className={cellInputClass}
                      placeholder="Pilih gender"
                      options={[...GENDER_OPTIONS]}
                      error={itemErrors?.gender?.message}
                      {...register(`peserta.${index}.gender`)}
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      className={cellInputClass}
                      placeholder="Pilih riwayat penyakit"
                      options={[...RIWAYAT_PENYAKIT_OPTIONS]}
                      error={itemErrors?.riwayatPenyakit?.message as string | undefined}
                      {...register(`peserta.${index}.riwayatPenyakit`)}
                    />
                  </td>
                  <td className="text-center p-2">
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      disabled={fields.length <= 1}
                      className="w-9 h-9 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy disabled:opacity-30 mx-auto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 bg-event-cream border-t-2 border-event-navy/20 flex items-center gap-2">
        <span className="font-body text-[10px] text-event-navy/50">
          ↔️ Geser ke samping untuk melihat semua kolom
        </span>
      </div>
    </div>
  )
}