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
  'w-full px-2.5 py-2 text-sm text-event-navy bg-white border rounded-[var(--radius-input)] border-[var(--color-border)] focus:border-event-blue focus:outline-none font-body caret-event-navy'

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
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] bg-white overflow-x-auto shadow-[var(--shadow-soft)]">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="bg-[var(--color-surface-muted)]">
            <th className="font-body text-xs font-semibold text-gray-500 px-3 py-3 w-12">No</th>
            <th className="font-body text-xs font-semibold text-gray-500 px-3 py-3 text-left">Nama Barang</th>
            <th className="font-body text-xs font-semibold text-gray-500 px-3 py-3 w-28">Jumlah</th>
            <th className="font-body text-xs font-semibold text-gray-500 px-3 py-3 w-40">Harga Satuan</th>
            <th className="font-body text-xs font-semibold text-gray-500 px-3 py-3 w-36 text-right">Total</th>
            <th className="font-body text-xs font-semibold text-gray-500 px-3 py-3 w-20">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => {
            const itemErrors = errors.items?.[index]
            const qty = Number(watchedItems?.[index]?.qty) || 0
            const harga = Number(watchedItems?.[index]?.hargaSatuan) || 0

            return (
              <tr key={field.id} className="border-t border-[var(--color-border)]">
                <td className="text-center font-body text-sm text-event-navy px-2 py-2">{index + 1}</td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    placeholder="Nama Barang"
                    className={cellInputClass}
                    {...register(`items.${index}.namaBarang`)}
                  />
                  {itemErrors?.namaBarang?.message && (
                    <p className="text-[10px] font-medium text-pmi-red mt-1">{itemErrors.namaBarang.message}</p>
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
                    <p className="text-[10px] font-medium text-pmi-red mt-1">{itemErrors.qty.message}</p>
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
                    <p className="text-[10px] font-medium text-pmi-red mt-1">{itemErrors.hargaSatuan.message}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-body font-semibold text-sm text-event-navy">
                  {formatRp(qty * harga)}
                </td>
                <td className="px-2 py-2">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      disabled={fields.length <= 1}
                      className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-input)] bg-red-50 text-pmi-red hover:bg-red-100 disabled:opacity-30 transition-colors"
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