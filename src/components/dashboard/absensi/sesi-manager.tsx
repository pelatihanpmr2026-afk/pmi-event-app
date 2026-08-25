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
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SesiFormValues>({
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
        setSesiList((prev) => prev.map((s) => (s.id === editingSesi.id ? { ...s, ...result.data } : s)))
        toast.success('Sesi berhasil diperbarui')
      } else {
        setSesiList((prev) => [...prev, { ...result.data, _count: { logs: 0 } }].sort((a, b) => a.tanggal.localeCompare(b.tanggal)))
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
    if (!confirm(`Hapus sesi "${nama}"? Log absensi terkait juga akan terhapus.`)) return
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

  const columns: ResponsiveTableColumn<SesiData>[] = [
    {
      key: 'nama',
      header: 'Nama Sesi',
      render: (row) => <span className="font-semibold">{row.nama}</span>,
    },
    {
      key: 'tanggal',
      header: 'Tanggal & Waktu',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-600">
            {new Date(row.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span className="text-xs text-gray-400">
            {row.jamMulai} - {row.jamSelesai} WIB
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => {
        const status = getSesiStatus({ tanggal: new Date(row.tanggal), jamMulai: row.jamMulai, jamSelesai: row.jamSelesai })
        const badge = STATUS_BADGE[status]
        return <Badge variant={badge.variant}>{badge.label}</Badge>
      },
    },
    {
      key: 'log',
      header: 'Log',
      align: 'center',
      render: (row) => <span className="text-gray-500">{row._count.logs} absen</span>,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      hideOnMobile: true,
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 text-gray-500 hover:text-event-navy hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-input)] transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.id, row.nama)}
            className="p-1.5 text-gray-500 hover:text-pmi-red hover:bg-red-50 rounded-[var(--radius-input)] transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  const renderMobileCard = (row: SesiData) => {
    const status = getSesiStatus({ tanggal: new Date(row.tanggal), jamMulai: row.jamMulai, jamSelesai: row.jamSelesai })
    const badge = STATUS_BADGE[status]
    return (
      <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <span className="font-body font-semibold text-event-navy">{row.nama}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <div className="text-xs text-gray-400 border-b border-[var(--color-border)] pb-2">
          {new Date(row.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400">{row.jamMulai} - {row.jamSelesai} WIB</span>
          <span className="font-medium text-gray-600">{row._count.logs} absen</span>
        </div>
        <div className="flex gap-2 pt-1 border-t border-[var(--color-border)]">
          <button onClick={() => openEditModal(row)} className="flex-1 py-1.5 rounded-[var(--radius-input)] bg-event-yellow text-event-navy text-xs font-medium">Edit</button>
          <button onClick={() => handleDelete(row.id, row.nama)} className="flex-1 py-1.5 rounded-[var(--radius-input)] bg-pmi-red text-white text-xs font-medium">Hapus</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs text-event-navy">SESI ABSENSI</h2>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3 py-2 bg-event-blue text-white rounded-[var(--radius-btn)] text-xs font-semibold hover:bg-event-blue-dark transition-colors"
        >
          <Plus size={14} />
          Tambah Sesi
        </button>
      </div>

      {sesiList.length === 0 ? (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white py-10 text-center">
          <p className="font-body text-sm text-gray-400">Belum ada sesi absensi.</p>
        </div>
      ) : (
        <ResponsiveTable columns={columns} data={sesiList} renderMobileCard={renderMobileCard} />
      )}

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
    </div>
  )
}