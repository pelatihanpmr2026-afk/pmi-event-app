'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { sesiSchema, SesiFormValues } from '@/lib/validations/absensi'
import { getSesiStatus } from '@/lib/absensi'

export interface SesiData {
  id: string
  nama: string
  tanggal: string
  jamMulai: string
  jamSelesai: string
  _count: { logs: number }
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  AKTIF: { label: 'SEDANG AKTIF', variant: 'success' },
  BELUM_MULAI: { label: 'BELUM MULAI', variant: 'warning' },
  SELESAI: { label: 'SELESAI', variant: 'default' },
}

export function SesiManager({ initialSesi }: { initialSesi: SesiData[] }) {
  const [sesiList, setSesiList] = useState(initialSesi)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSesi, setEditingSesi] = useState<SesiData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SesiFormValues>({
    resolver: zodResolver(sesiSchema),
  })

  function openCreateModal() {
    setEditingSesi(null)
    reset({ nama: '', tanggal: '', jamMulai: '', jamSelesai: '' })
    setIsModalOpen(true)
  }

  function openEditModal(sesi: SesiData) {
    setEditingSesi(sesi)
    reset({
      nama: sesi.nama,
      tanggal: sesi.tanggal.slice(0, 10),
      jamMulai: sesi.jamMulai,
      jamSelesai: sesi.jamSelesai,
    })
    setIsModalOpen(true)
  }

  async function onSubmit(values: SesiFormValues) {
    setIsSubmitting(true)
    try {
      const url = editingSesi ? `/api/absensi/sesi/${editingSesi.id}` : '/api/absensi/sesi'
      const method = editingSesi ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan sesi')

      if (editingSesi) {
        setSesiList((prev) =>
          prev.map((s) => (s.id === editingSesi.id ? { ...s, ...result.data } : s))
        )
        toast.success('Sesi berhasil diperbarui')
      } else {
        setSesiList((prev) =>
          [...prev, { ...result.data, _count: { logs: 0 } }].sort((a, b) =>
            a.tanggal.localeCompare(b.tanggal)
          )
        )
        toast.success('Sesi berhasil ditambahkan')
      }

      setIsModalOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus sesi "${nama}"? Log absensi terkait sesi ini juga akan terhapus.`)) return

    try {
      const res = await fetch(`/api/absensi/sesi/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menghapus sesi')

      setSesiList((prev) => prev.filter((s) => s.id !== id))
      toast.success('Sesi berhasil dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    }
  }

  return (
    <Card>
      <div className="px-5 py-3 bg-event-blue border-b-3 border-event-navy flex items-center justify-between">
        <h2 className="font-heading text-xs text-white">SESI ABSENSI</h2>
        <button
          onClick={openCreateModal}
          className="w-8 h-8 flex items-center justify-center bg-white border-2 border-event-navy text-event-navy hover:bg-event-cream transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {sesiList.length === 0 && (
          <p className="font-body text-xs text-event-navy/50 text-center py-6">
            Belum ada sesi absensi. Klik tombol + untuk menambahkan.
          </p>
        )}

        {sesiList.map((sesi) => {
          const status = getSesiStatus({
            tanggal: new Date(sesi.tanggal),
            jamMulai: sesi.jamMulai,
            jamSelesai: sesi.jamSelesai,
          })
          const badge = STATUS_BADGE[status]

          return (
            <div
              key={sesi.id}
              className="border-2 border-event-navy/20 p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body font-bold text-sm text-event-navy">{sesi.nama}</span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <p className="font-body text-xs text-event-navy/60 mt-1">
                  {new Date(sesi.tanggal).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  · {sesi.jamMulai} - {sesi.jamSelesai} WIB · {sesi._count.logs} absen tercatat
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEditModal(sesi)}
                  className="w-8 h-8 flex items-center justify-center bg-event-yellow border-2 border-event-navy hover:bg-event-yellow-dark transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(sesi.id, sesi.nama)}
                  className="w-8 h-8 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSesi ? 'EDIT SESI' : 'TAMBAH SESI'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Nama Sesi"
            placeholder="Contoh: Hari 1 - Pelatihan"
            error={errors.nama?.message}
            {...register('nama')}
          />
          <Input
            label="Tanggal"
            type="date"
            error={errors.tanggal?.message}
            {...register('tanggal')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Jam Mulai"
              type="time"
              error={errors.jamMulai?.message}
              {...register('jamMulai')}
            />
            <Input
              label="Jam Selesai"
              type="time"
              error={errors.jamSelesai?.message}
              {...register('jamSelesai')}
            />
          </div>
          <Button type="submit" variant="primary" isLoading={isSubmitting} className="mt-2">
            {editingSesi ? 'Simpan Perubahan' : 'Tambah Sesi'}
          </Button>
        </form>
      </Modal>
    </Card>
  )
}