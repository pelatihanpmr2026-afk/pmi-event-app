'use client'

import { UseFieldArrayReturn, UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { z } from 'zod'
import { itemBarangArraySchema } from '@/lib/validations/pengajuan-anggaran'

const formSchema = z.object({ items: itemBarangArraySchema })
type FormValues = z.infer<typeof formSchema>

function formatRp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

const cellInputClass =
  'w-full px-2.5 py-2 text-sm border-2 border-event-navy/30 focus:border-event-navy focus:outline-none font-body'

export function ItemsTable({
  fields,
  register,
  watch,
  errors,
  onRemove,
}: {
  fields: UseFieldArrayReturn<FormValues, 'items'>['fields']
  register: UseFormRegister<FormValues>
  watch: UseFormWatch<FormValues>
  errors: FieldErrors<FormValues>
  onRemove: (index: number) => void
}) {
  const watchedItems = watch('items')

  return (
    <div className="border-3 border-event-navy bg-white overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="bg-event-navy text-white">
            <th className="font-body text-xs px-3 py-3 w-12">No</th>
            <th className="font-body text-xs px-3 py-3 text-left">Nama Barang</th>
            <th className="font-body text-xs px-3 py-3 w-28">Jumlah</th>
            <th className="font-body text-xs px-3 py-3 w-40">Harga Satuan</th>
            <th className="font-body text-xs px-3 py-3 w-36 text-right">Total</th>
            <th className="font-body text-xs px-3 py-3 w-20">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => {
            const itemErrors = errors.items?.[index]
            const qty = Number(watchedItems?.[index]?.qty) || 0
            const harga = Number(watchedItems?.[index]?.hargaSatuan) || 0

            return (
              <tr key={field.id} className={`border-t-2 border-event-navy/10 ${index % 2 === 1 ? 'bg-event-cream/40' : ''}`}>
                <td className="text-center font-body text-sm text-event-navy/60 px-2 py-2">{index + 1}</td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    placeholder="Nama Barang"
                    className={cellInputClass}
                    {...register(`items.${index}.namaBarang`)}
                  />
                  {itemErrors?.namaBarang?.message && (
                    <p className="text-[10px] font-bold text-pmi-red mt-1">{itemErrors.namaBarang.message}</p>
                  )}
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    placeholder="0"
                    className={cellInputClass}
                    {...register(`items.${index}.qty`)}
                  />
                  {itemErrors?.qty?.message && (
                    <p className="text-[10px] font-bold text-pmi-red mt-1">{itemErrors.qty.message}</p>
                  )}
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    placeholder="0"
                    className={cellInputClass}
                    {...register(`items.${index}.hargaSatuan`)}
                  />
                  {itemErrors?.hargaSatuan?.message && (
                    <p className="text-[10px] font-bold text-pmi-red mt-1">{itemErrors.hargaSatuan.message}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-body font-bold text-sm text-event-navy">
                  {formatRp(qty * harga)}
                </td>
                <td className="px-2 py-2">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      disabled={fields.length <= 1}
                      className="w-9 h-9 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}