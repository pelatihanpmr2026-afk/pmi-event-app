'use client'

import { useFormContext } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { ParticipantPhotoUpload } from './participant-photo-upload'
import { AGAMA_OPTIONS, GOLONGAN_DARAH_OPTIONS, RIWAYAT_PENYAKIT_OPTIONS } from '@/lib/constants-sekolah'
import { GENDER_OPTIONS } from '@/lib/constants'
import { normalizeNamaPeserta, PesertaOnlyValues } from '@/lib/validations/peserta'

const cellInput = 'w-full px-2 py-1 border rounded-[var(--radius-input)] text-event-navy bg-transparent focus:outline-none focus:border-event-blue h-8 min-w-0'

export function PesertaTable({ fields, onRemove }: { fields: { id: string }[]; onRemove: (index: number) => void }) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<PesertaOnlyValues>()

  return (
    <div className="border-3 border-event-navy rounded-[var(--radius-card)] overflow-hidden shadow-pixel-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs table-fixed">
          <thead className="bg-[var(--color-surface-muted)]">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-gray-500 w-6">#</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500 w-20">Foto</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Nama</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Tempat, Tgl Lahir</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Alamat</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Agama / Gol.Darah</th>
              <th className="px-2 py-2 text-center font-medium text-gray-500 w-16">Thn Masuk</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">HP / Gender</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500">Riwayat</th>
              <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">Hapus</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const itemErrors = errors.peserta?.[index]
              const namaLengkapField = register(`peserta.${index}.namaLengkap`)

              return (
                <tr key={field.id} className="border-t border-[var(--color-border)] align-top">
                  <td className="px-2 py-2 text-center text-gray-500 pt-3">{index + 1}</td>
                  <td className="px-2 py-2">
                    <ParticipantPhotoUpload
                      value={watch(`peserta.${index}.foto`)}
                      onChange={(file) => setValue(`peserta.${index}.foto`, file as File, { shouldValidate: true })}
                      error={itemErrors?.foto?.message}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      {...namaLengkapField}
                      onBlur={(event) => {
                        namaLengkapField.onBlur(event)
                        setValue(`peserta.${index}.namaLengkap`, normalizeNamaPeserta(event.target.value), { shouldValidate: true })
                      }}
                      className={cellInput}
                      placeholder="Nama"
                    />
                    {itemErrors?.namaLengkap && <p className="text-[10px] text-pmi-red">{itemErrors.namaLengkap.message}</p>}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-col gap-1">
                      <input
                        {...register(`peserta.${index}.tempatLahir`)}
                        className={cellInput}
                        placeholder="Tempat"
                      />
                      <input
                        {...register(`peserta.${index}.tanggalLahir`)}
                        type="date"
                        min="1900-01-01"
                        max={new Date().toISOString().slice(0, 10)}
                        className={cellInput}
                      />
                    </div>
                    {itemErrors?.tempatLahir && <p className="text-[10px] text-pmi-red">{itemErrors.tempatLahir.message}</p>}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      {...register(`peserta.${index}.alamat`)}
                      className={cellInput}
                      placeholder="Alamat"
                    />
                    {itemErrors?.alamat && <p className="text-[10px] text-pmi-red">{itemErrors.alamat.message}</p>}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex flex-col gap-1">
                      <select
                        {...register(`peserta.${index}.agama`)}
                        className={cellInput}
                      >
                        <option value="">Agama</option>
                        {AGAMA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <select
                        {...register(`peserta.${index}.golonganDarah`)}
                        className={cellInput}
                      >
                        <option value="">Gol. Darah</option>
                        {GOLONGAN_DARAH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    {itemErrors?.agama && <p className="text-[10px] text-pmi-red">{itemErrors.agama.message}</p>}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input
                      {...register(`peserta.${index}.tahunMasuk`)}
                      className={`${cellInput} text-center`}
                      placeholder="Thn"
                    />
                    {itemErrors?.tahunMasuk && <p className="text-[10px] text-pmi-red">{itemErrors.tahunMasuk.message}</p>}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-col gap-1">
                      <input
                        {...register(`peserta.${index}.noHp`)}
                        className={cellInput}
                        placeholder="No HP"
                      />
                      <select
                        {...register(`peserta.${index}.gender`)}
                        className={cellInput}
                      >
                        <option value="">Gender</option>
                        {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    {itemErrors?.noHp && <p className="text-[10px] text-pmi-red">{itemErrors.noHp.message}</p>}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      {...register(`peserta.${index}.riwayatPenyakit`)}
                      className={cellInput}
                    >
                      <option value="">Pilih</option>
                      {RIWAYAT_PENYAKIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {itemErrors?.riwayatPenyakit && <p className="text-[10px] text-pmi-red">{itemErrors.riwayatPenyakit.message}</p>}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      disabled={fields.length <= 1}
                      className="p-1 text-gray-400 hover:text-pmi-red disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}