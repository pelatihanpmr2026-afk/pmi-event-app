'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Tent } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { tendaJenisSchema, TendaJenisFormValues } from '@/lib/validations/tenda-jenis'

export interface TendaData {
  id: string
  nama: string
  namaVendor: string | null
  kapasitasMin: number
  kapasitasMax: number
  harga: number
  hargaVendor: number
  stokTotal: number
  stokTersisa: number
}

export function TendaManager({ initialTenda }: { initialTenda: TendaData[] }) {
  const [tendaList, setTendaList] = useState(initialTenda)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTenda, setEditingTenda] = useState<TendaData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TendaJenisFormValues>({
    resolver: zodResolver(tendaJenisSchema),
  })

function openCreateModal() {
  setEditingTenda(null)
  reset({ nama: '', namaVendor: '', kapasitasMin: '', kapasitasMax: '', harga: '', hargaVendor: '', stokTotal: '' })
  setIsModalOpen(true)
}

function openEditModal(tenda: TendaData) {
  setEditingTenda(tenda)
  reset({
    nama: tenda.nama,
    namaVendor: tenda.namaVendor ?? '',
    kapasitasMin: String(tenda.kapasitasMin),
    kapasitasMax: String(tenda.kapasitasMax),
    harga: String(tenda.harga),
    hargaVendor: String(tenda.hargaVendor),
    stokTotal: String(tenda.stokTotal),
  })
  setIsModalOpen(true)
}

  async function refreshList() {
    const res = await fetch('/api/tenda')
    const result = await res.json()
    if (result.success) setTendaList(result.data)
  }

async function onSubmit(values: TendaJenisFormValues) {
  setIsSubmitting(true)
  try {
    const url = editingTenda ? `/api/tenda/${editingTenda.id}` : '/api/tenda'
    const method = editingTenda ? 'PATCH' : 'POST'

const payload = {
  nama: values.nama,
  namaVendor: values.namaVendor,
  kapasitasMin: Number(values.kapasitasMin),
  kapasitasMax: Number(values.kapasitasMax),
  harga: Number(values.harga),
  hargaVendor: Number(values.hargaVendor),
  stokTotal: Number(values.stokTotal),
}

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await res.json()

    if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan data tenda')

    toast.success(editingTenda ? 'Tenda berhasil diperbarui' : 'Tenda berhasil ditambahkan')
    setIsModalOpen(false)
    await refreshList()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
  } finally {
    setIsSubmitting(false)
  }
}

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus jenis tenda "${nama}"?`)) return

    try {
      const res = await fetch(`/api/tenda/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menghapus tenda')

      toast.success('Tenda berhasil dihapus')
      await refreshList()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    }
  }

  return (
    <Card>
      <div className="px-5 py-3 bg-event-blue border-b-3 border-event-navy flex items-center justify-between">
        <h2 className="font-heading text-xs text-white">JENIS TENDA</h2>
        <button
          onClick={openCreateModal}
          className="w-8 h-8 flex items-center justify-center bg-white border-2 border-event-navy text-event-navy hover:bg-event-cream transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tendaList.length === 0 && (
          <p className="font-body text-xs text-event-navy/50 text-center py-6 col-span-2">
            Belum ada jenis tenda. Klik tombol + untuk menambahkan.
          </p>
        )}

        {tendaList.map((tenda) => {
          const terpakai = tenda.stokTotal - tenda.stokTersisa
          const persentase = tenda.stokTotal > 0 ? Math.min((terpakai / tenda.stokTotal) * 100, 100) : 0
          const habis = tenda.stokTersisa === 0

          return (
            <div key={tenda.id} className="border-2 border-event-navy/20 p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-event-navy/10 border-2 border-event-navy flex items-center justify-center shrink-0">
                    <Tent size={14} className="text-event-navy" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-body font-bold text-xs text-event-navy truncate">{tenda.nama}</p>
                    <p className="font-body text-[10px] text-event-navy/50">
                      {tenda.kapasitasMin}-{tenda.kapasitasMax} orang · Rp
                      {tenda.harga.toLocaleString('id-ID')}
                    </p>
                    {tenda.namaVendor && (
                      <p className="font-body text-[10px] text-event-navy/40">
                        Vendor: {tenda.namaVendor}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(tenda)}
                    className="w-7 h-7 flex items-center justify-center bg-event-yellow border-2 border-event-navy hover:bg-event-yellow-dark transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(tenda.id, tenda.nama)}
                    className="w-7 h-7 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-body text-[10px] text-event-navy/60">
                  Stok: {terpakai}/{tenda.stokTotal} terpakai
                </span>
                <span
                  className={`font-body text-[10px] font-bold ${
                    habis ? 'text-pmi-red' : 'text-event-navy'
                  }`}
                >
                  {tenda.stokTersisa} tersisa
                </span>
              </div>
              <div className="h-2 bg-event-navy/10 border border-event-navy/20">
                <div
                  className={`h-full ${habis ? 'bg-pmi-red' : 'bg-event-blue'}`}
                  style={{ width: `${persentase}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTenda ? 'EDIT JENIS TENDA' : 'TAMBAH JENIS TENDA'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Nama Tenda"
            placeholder="Contoh: Tenda Dome"
            error={errors.nama?.message}
            {...register('nama')}
          />
          <Input
            label="Nama Vendor"
            placeholder="Contoh: CV Sejahtera Tenda"
            error={errors.namaVendor?.message}
            {...register('namaVendor')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kapasitas Min"
              type="number"
              placeholder="10"
              error={errors.kapasitasMin?.message}
              {...register('kapasitasMin')}
            />
            <Input
              label="Kapasitas Maks"
              type="number"
              placeholder="12"
              error={errors.kapasitasMax?.message}
              {...register('kapasitasMax')}
            />
          </div>
          <Input
            label="Harga Sewa (Rp)"
            type="number"
            placeholder="400000"
            error={errors.harga?.message}
            {...register('harga')}
          />
          <Input
  label="Harga Setor ke Vendor (Rp/unit)"
  type="number"
  placeholder="250000"
  error={errors.hargaVendor?.message}
  {...register('hargaVendor')}
/>
<p className="font-body text-[10px] text-event-navy/50 -mt-2">
  Selisih (Harga Sewa − Harga Vendor) otomatis jadi profit panitia di modul Keuangan.
</p>
          <Input
            label="Stok Total"
            type="number"
            placeholder="5"
            error={errors.stokTotal?.message}
            {...register('stokTotal')}
          />
          {editingTenda && (
            <p className="font-body text-[11px] text-event-navy/60">
              ⚠️ Mengubah stok total di bawah jumlah yang sudah terpakai ({editingTenda.stokTotal - editingTenda.stokTersisa}) bisa membuat sistem menghitung stok tersisa jadi negatif — hindari itu.
            </p>
          )}
          <Button type="submit" variant="primary" isLoading={isSubmitting} className="mt-2">
            {editingTenda ? 'Simpan Perubahan' : 'Tambah Tenda'}
          </Button>
        </form>
      </Modal>
    </Card>
  )
}