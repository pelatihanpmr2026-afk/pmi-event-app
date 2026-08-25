'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { Plus, Trash2, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ItemsTable } from './items-table'
import { useMediaQuery } from '@/hooks/use-media-query'
import { DIVISI_OPTIONS } from '@/lib/constants'
import {
  itemBarangArraySchema,
  createEmptyItem,
} from '@/lib/validations/pengajuan-anggaran'

const formSchema = z.object({ items: itemBarangArraySchema })
type FormValues = z.infer<typeof formSchema>

interface PengajuanData {
  id: string
  nomorPengajuan: string
  status: string
  namaKoordinator: string
  divisi: string
  totalJenisBarang: number
  totalKuantitas: number
  totalPengajuan: number
  items: { namaBarang: string; qty: number; hargaSatuan: number }[]
}

function formatRp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

function toFormItems(items: PengajuanData['items']) {
  if (!items.length) return [createEmptyItem()]
  return items.map((it) => ({
    namaBarang: it.namaBarang,
    qty: String(it.qty),
    hargaSatuan: String(it.hargaSatuan),
  }))
}

export function EditPengajuanForm({ pengajuanId }: { pengajuanId: string }) {
  const router = useRouter()
  const [pengajuan, setPengajuan] = useState<PengajuanData | null>(null)
  const [noHp, setNoHp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    if (!noHp.trim()) {
      setError('Nomor WhatsApp wajib diisi')
      return
    }
    setIsVerifying(true)
    setError(null)
    try {
      const res = await fetch(`/api/pengajuan-anggaran/${pengajuanId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noHp: noHp.trim() }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        setError(result?.message || 'Verifikasi gagal')
        return
      }
      setPengajuan(result.data as PengajuanData)
    } catch {
      setError('Terjadi kesalahan, silakan coba lagi')
    } finally {
      setIsVerifying(false)
    }
  }

  if (!pengajuan) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card>
          <CardHeader variant="blue">
            <h2 className="font-heading text-xs sm:text-sm flex items-center gap-2">
              <ShieldCheck size={16} />
              VERIFIKASI KEPEMILIKAN PENGAJUAN
            </h2>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleVerify()
              }}
              className="flex flex-col gap-4"
            >
              <p className="font-body text-xs text-event-navy/60">
                Masukkan No. WhatsApp koordinator yang terdaftar pada pengajuan ini untuk
                mengedit atau menambah item barang.
              </p>
              <Input
                label="No. WhatsApp Koordinator"
                placeholder="Contoh: 081234567890"
                inputMode="tel"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
              />
              {error && (
                <div className="border-3 border-pmi-red bg-pmi-red/10 p-3">
                  <p className="font-body text-xs text-event-navy">{error}</p>
                </div>
              )}
              <Button type="submit" variant="primary" isLoading={isVerifying}>
                Verifikasi & Lanjutkan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <EditItemsForm
      pengajuanId={pengajuanId}
      noHp={noHp.trim()}
      pengajuan={pengajuan}
      onCancel={() => router.push(`/pengajuan-anggaran/sukses?id=${pengajuanId}`)}
    />
  )
}

function EditItemsForm({
  pengajuanId,
  noHp,
  pengajuan,
  onCancel,
}: {
  pengajuanId: string
  noHp: string
  pengajuan: PengajuanData
  onCancel: () => void
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const {
    control,
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: toFormItems(pengajuan.items) },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')
  const totalJenisBarang = watchedItems?.length ?? 0
  const totalKuantitas = watchedItems?.reduce((sum, it) => sum + (Number(it.qty) || 0), 0) ?? 0
  const totalPengajuan =
    watchedItems?.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.hargaSatuan) || 0), 0) ?? 0

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const items = values.items.map((it) => ({
        namaBarang: it.namaBarang,
        qty: Number(it.qty),
        hargaSatuan: Number(it.hargaSatuan),
      }))
      const res = await fetch(`/api/pengajuan-anggaran/${pengajuanId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noHp, items }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal memperbarui pengajuan')
      toast.success('Pengajuan berhasil diperbarui')
      router.push(`/pengajuan-anggaran/sukses?id=${pengajuanId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      <Card>
        <CardHeader variant="blue">
          <h2 className="font-heading text-xs sm:text-sm">EDIT PENGAJUAN</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="border-3 border-event-navy bg-white p-4">
              <p className="font-body text-xs text-event-navy/60">Nomor Pengajuan</p>
              <p className="font-body font-bold text-sm text-event-navy">{pengajuan.nomorPengajuan}</p>
              <p className="font-body text-xs text-event-navy/60 mt-1">Koordinator</p>
              <p className="font-body font-bold text-sm text-event-navy">{pengajuan.namaKoordinator}</p>
              <p className="font-body text-xs text-event-navy/60 mt-1">
                {DIVISI_OPTIONS.find((d) => d.value === pengajuan.divisi)?.label} · Status:{' '}
                <span className="font-bold text-event-blue">{pengajuan.status}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-[11px] text-event-navy">RINCIAN BARANG/KEBUTUHAN</h3>
                <button
                  type="button"
                  onClick={() => append(createEmptyItem())}
                  className="flex items-center gap-1 px-3 py-2 bg-event-blue text-white border-3 border-event-navy font-body text-xs font-semibold"
                >
                  <Plus size={12} />
                  Tambah Baris
                </button>
              </div>

              {errors.items?.message && <p className="text-xs font-bold text-pmi-red">{errors.items.message}</p>}

              {isDesktop ? (
                <ItemsTable fields={fields} register={register} watch={watch} errors={errors} onRemove={remove} />
              ) : (
                <div className="flex flex-col gap-3">
                  {fields.map((field, index) => {
                    const itemErrors = errors.items?.[index]
                    const qty = Number(watchedItems?.[index]?.qty) || 0
                    const harga = Number(watchedItems?.[index]?.hargaSatuan) || 0
                    return (
                      <div key={field.id} className="border-3 border-event-navy bg-white p-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-[9px] text-event-navy/50">BARANG {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                            className="w-7 h-7 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy disabled:opacity-40"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <Input
                          label="Nama Barang/Kebutuhan"
                          placeholder="Contoh: Spanduk 3x1m"
                          error={itemErrors?.namaBarang?.message}
                          {...register(`items.${index}.namaBarang`)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Qty"
                            inputMode="numeric"
                            placeholder="1"
                            error={itemErrors?.qty?.message}
                            {...register(`items.${index}.qty`)}
                          />
                          <Input
                            label="Harga Satuan (Rp)"
                            inputMode="numeric"
                            placeholder="50000"
                            error={itemErrors?.hargaSatuan?.message}
                            {...register(`items.${index}.hargaSatuan`)}
                          />
                        </div>
                        <div className="flex justify-between font-body text-xs text-event-navy">
                          <span className="text-event-navy/60">Subtotal</span>
                          <span className="font-bold">{formatRp(qty * harga)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-3 border-event-navy bg-event-yellow/20 p-4 flex flex-col gap-2">
              <div className="flex justify-between font-body text-xs text-event-navy">
                <span>Total Jenis Barang</span>
                <span className="font-bold">{totalJenisBarang}</span>
              </div>
              <div className="flex justify-between font-body text-xs text-event-navy">
                <span>Total Kuantitas</span>
                <span className="font-bold">{totalKuantitas}</span>
              </div>
              <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20">
                <span>TOTAL PENGAJUAN</span>
                <span>{formatRp(totalPengajuan)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="flex-1">
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}