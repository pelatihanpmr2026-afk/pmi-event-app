'use client'

import { UseFormReturn } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { AGAMA_OPTIONS, GOLONGAN_DARAH_OPTIONS } from '@/lib/constants-sekolah'
import { GENDER_OPTIONS } from '@/lib/constants'
import { PesertaPendampingValues } from '@/lib/validations/peserta'

const cellInputClass = 'w-full px-2.5 py-2.5 text-sm'
const cellLabelClass = 'font-body text-[10px] font-bold text-event-navy/50 mb-1 block'

export function PendampingTable({
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
    formState: { errors },
  } = form

  if (fields.length === 0) {
    return (
      <div className="border-3 border-dashed border-event-navy/30 bg-white py-10 text-center">
        <p className="font-body text-xs text-event-navy/50">
          Belum ada pendamping ditambahkan (opsional)
        </p>
      </div>
    )
  }

  return (
    <div className="border-3 border-event-navy bg-white">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: '1250px' }}>
          <thead>
            <tr className="bg-event-pink text-white">
              <th className="font-body text-xs px-2 py-3 w-12">No</th>
              <th className="font-body text-xs px-2 py-3 text-left w-48">Nama Lengkap</th>
              <th className="font-body text-xs px-2 py-3 text-left w-56">Tempat & Tanggal Lahir</th>
              <th className="font-body text-xs px-2 py-3 text-left w-56">Alamat</th>
              <th className="font-body text-xs px-2 py-3 text-left w-48">Agama & Gol. Darah</th>
              <th className="font-body text-xs px-2 py-3 text-left w-28">Tahun Masuk</th>
              <th className="font-body text-xs px-2 py-3 text-left w-48">No. HP & Gender</th>
              <th className="font-body text-xs px-2 py-3 w-16">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const itemErrors = errors.pendamping?.[index]
              return (
                <tr
                  key={field.id}
                  className={`border-t-2 border-event-navy/10 align-top ${index % 2 === 1 ? 'bg-event-cream/40' : ''}`}
                >
                  <td className="text-center font-body text-sm text-event-navy/60 py-4">
                    {index + 1}
                  </td>
                  <td className="p-2">
                    <Input
                      className={cellInputClass}
                      error={itemErrors?.namaLengkap?.message}
                      {...register(`pendamping.${index}.namaLengkap`)}
                    />
                  </td>
                  <td className="p-2">
                    <span className={cellLabelClass}>Tempat Lahir</span>
                    <Input
                      className={`${cellInputClass} mb-2`}
                      error={itemErrors?.tempatLahir?.message}
                      {...register(`pendamping.${index}.tempatLahir`)}
                    />
                    <span className={cellLabelClass}>Tanggal Lahir</span>
                    <Input
                      type="date"
                      className={cellInputClass}
                      error={itemErrors?.tanggalLahir?.message}
                      {...register(`pendamping.${index}.tanggalLahir`)}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      className={cellInputClass}
                      error={itemErrors?.alamat?.message}
                      {...register(`pendamping.${index}.alamat`)}
                    />
                  </td>
                  <td className="p-2">
                    <span className={cellLabelClass}>Agama</span>
                    <Select
                      className={`${cellInputClass} mb-2`}
                      placeholder="Pilih agama"
                      options={[...AGAMA_OPTIONS]}
                      error={itemErrors?.agama?.message}
                      {...register(`pendamping.${index}.agama`)}
                    />
                    <span className={cellLabelClass}>Golongan Darah</span>
                    <Select
                      className={cellInputClass}
                      placeholder="Pilih gol. darah"
                      options={[...GOLONGAN_DARAH_OPTIONS]}
                      error={itemErrors?.golonganDarah?.message}
                      {...register(`pendamping.${index}.golonganDarah`)}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      className={cellInputClass}
                      inputMode="numeric"
                      placeholder="2024"
                      error={itemErrors?.tahunMasuk?.message}
                      {...register(`pendamping.${index}.tahunMasuk`)}
                    />
                  </td>
                  <td className="p-2">
                    <span className={cellLabelClass}>No. HP (Opsional)</span>
                    <Input
                      className={`${cellInputClass} mb-2`}
                      error={itemErrors?.noHp?.message}
                      {...register(`pendamping.${index}.noHp`)}
                    />
                    <span className={cellLabelClass}>Jenis Kelamin</span>
                    <Select
                      className={cellInputClass}
                      placeholder="Pilih gender"
                      options={[...GENDER_OPTIONS]}
                      error={itemErrors?.gender?.message}
                      {...register(`pendamping.${index}.gender`)}
                    />
                  </td>
                  <td className="text-center p-2">
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      className="w-9 h-9 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy mx-auto"
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
      <div className="px-3 py-2 bg-event-pink/10 border-t-2 border-event-navy/20">
        <span className="font-body text-[10px] text-event-navy/50">
          ↔️ Geser ke samping untuk melihat semua kolom
        </span>
      </div>
    </div>
  )
}