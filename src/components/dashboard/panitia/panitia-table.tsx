'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Search, Eye, Pencil, Trash2, FileDown, FileSpreadsheet, Check, X, UserPlus, Settings, CreditCard, Wallet } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { ASAL_UNIT_OPTIONS, DIVISI_OPTIONS } from '@/lib/constants'
import { formatRp } from '@/lib/keuangan'
import { PanitiaDetailModal, type PanitiaData, type SesiRingkas } from './panitia-detail-modal'
import { PanitiaEditModal, type PanitiaUpdated } from './panitia-edit-modal'
import { PanitiaAddModal } from './panitia-add-modal'
import { PanitiaKuotaModal } from './panitia-kuota-modal'
import { PanitiaPerdiemModal } from './panitia-perdiem-modal'
import { PanitiaPerdiemBulkModal } from './panitia-perdiem-bulk-modal'

function findLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((opt) => opt.value === value)?.label ?? value
}

export function PanitiaTable({
  initialData,
  sesiList,
}: {
  initialData: PanitiaData[]
  sesiList: SesiRingkas[]
}) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [filterDivisi, setFilterDivisi] = useState('')
  const [selected, setSelected] = useState<PanitiaData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<PanitiaData | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isKuotaOpen, setIsKuotaOpen] = useState(false)
  const [perdiemTarget, setPerdiemTarget] = useState<PanitiaData | null>(null)
  const [isPerdiemOpen, setIsPerdiemOpen] = useState(false)
  const [isBulkPerdiemOpen, setIsBulkPerdiemOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return data.filter((p) => {
      const matchSearch =
        search.trim() === '' ||
        p.nama.toLowerCase().includes(search.toLowerCase()) ||
        p.nomorRegistrasi.toLowerCase().includes(search.toLowerCase())
      const matchUnit = filterUnit === '' || p.asalUnit === filterUnit
      const matchDivisi = filterDivisi === '' || p.divisi === filterDivisi
      return matchSearch && matchUnit && matchDivisi
    })
  }, [data, search, filterUnit, filterDivisi])

  function openDetail(panitia: PanitiaData) {
    setSelected(panitia)
    setIsModalOpen(true)
  }

  function openEdit(panitia: PanitiaData) {
    setEditing(panitia)
    setIsEditOpen(true)
  }

  function openPerdiem(panitia: PanitiaData) {
    setPerdiemTarget(panitia)
    setIsPerdiemOpen(true)
  }

  function handlePerdiemSaved(id: string, perdiem: number) {
    setData((prev) => prev.map((p) => (p.id === id ? { ...p, perdiem } : p)))
  }

  function handleBulkPerdiemSaved(ids: string[], perdiem: number) {
    const idSet = new Set(ids)
    setData((prev) => prev.map((p) => (idSet.has(p.id) ? { ...p, perdiem } : p)))
  }

  function handleSaved(updated: PanitiaUpdated) {
    setData((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? { ...p, ...updated, createdAt: p.createdAt, absensiLogs: p.absensiLogs }
          : p
      )
    )
  }

  function handleAdded(created: PanitiaUpdated & { createdAt?: string }) {
    const newRow: PanitiaData = {
      id: created.id,
      nomorRegistrasi: created.nomorRegistrasi,
      nama: created.nama,
      gender: created.gender,
      noWhatsapp: created.noWhatsapp,
      alamat: created.alamat,
      asalUnit: created.asalUnit,
      divisi: created.divisi,
      fotoUrl: created.fotoUrl,
      qrCodeUrl: created.qrCodeUrl,
      idCardUrl: created.idCardUrl,
      status: created.status,
      perdiem: created.perdiem ?? 0,
      createdAt: created.createdAt ?? new Date().toISOString(),
      absensiLogs: [],
    }
    setData((prev) => [newRow, ...prev])
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus data panitia "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/panitia/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menghapus data')
      setData((prev) => prev.filter((p) => p.id !== id))
      toast.success('Data panitia berhasil dihapus')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setDeletingId(null)
    }
  }

  function handleExportCsv() {
    const headers = ['No Registrasi', 'Nama', 'Gender', 'WhatsApp', 'Alamat', 'Asal Unit', 'Divisi', 'Status']
    const rows = filtered.map((p) => [
      p.nomorRegistrasi,
      p.nama,
      p.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
      p.noWhatsapp,
      p.alamat.replace(/,/g, ';'),
      findLabel(ASAL_UNIT_OPTIONS, p.asalUnit),
      findLabel(DIVISI_OPTIONS, p.divisi),
      p.status,
    ])
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `data-panitia-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleExportExcel() {
    const query = filterDivisi ? `?divisi=${encodeURIComponent(filterDivisi)}` : ''
    window.open(`/api/panitia/export${query}`, '_blank', 'noopener,noreferrer')
  }

  function handleExportLengkap(format: 'excel' | 'pdf') {
    const params = new URLSearchParams()
    params.set('format', format)
    if (search.trim()) params.set('search', search.trim())
    if (filterUnit) params.set('unit', filterUnit)
    if (filterDivisi) params.set('divisi', filterDivisi)
    window.open(`/api/panitia/export-lengkap?${params}`, '_blank', 'noopener,noreferrer')
  }

  function handleExportIdCard() {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (filterUnit) params.set('unit', filterUnit)
    if (filterDivisi) params.set('divisi', filterDivisi)
    window.open(`/api/panitia/export-idcard?${params}`, '_blank', 'noopener,noreferrer')
  }

  const columns: ResponsiveTableColumn<PanitiaData>[] = [
    {
      key: 'foto',
      header: 'Foto',
      width: '60px',
      align: 'center',
      hideOnMobile: true,
      render: (row) => (
        <div className="relative w-10 h-10 border border-[var(--color-border)] rounded-[var(--radius-input)] overflow-hidden mx-auto">
          <Image src={row.fotoUrl} alt={row.nama} fill className="object-cover" />
        </div>
      ),
    },
    {
      key: 'nama',
      header: 'Nama',
      render: (row) => <span className="font-semibold">{row.nama}</span>,
    },
    {
      key: 'registrasi',
      header: 'No. Registrasi',
      render: (row) => <span className="text-gray-500">{row.nomorRegistrasi}</span>,
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (row) => <span className="text-gray-600">{findLabel(ASAL_UNIT_OPTIONS, row.asalUnit)}</span>,
    },
    {
      key: 'divisi',
      header: 'Divisi',
      render: (row) => <span className="text-gray-600">{findLabel(DIVISI_OPTIONS, row.divisi)}</span>,
    },
    ...sesiList.map((sesi) => ({
      key: `sesi-${sesi.id}`,
      header: sesi.nama,
      align: 'center' as const,
      render: (row: PanitiaData) => {
        const hadir = row.absensiLogs.some((l) => l.sesiId === sesi.id)
        return hadir ? (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white" title={`Hadir ${sesi.nama}`}>
            <Check size={13} />
          </span>
        ) : (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-400" title={`Belum hadir ${sesi.nama}`}>
            <X size={13} />
          </span>
        )
      },
    })),
    {
      key: 'perdiem',
      header: 'Perdiem',
      align: 'right',
      render: (row) => <span className="font-semibold whitespace-nowrap">{formatRp(row.perdiem ?? 0)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <Badge variant={row.status === 'HADIR' ? 'success' : 'info'}>{row.status}</Badge>,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      hideOnMobile: true,
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => openDetail(row)}
            className="p-1.5 text-gray-500 hover:text-event-navy hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-input)] transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 text-gray-500 hover:text-event-navy hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-input)] transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => openPerdiem(row)}
            title={`Input perdiem ${row.nama}`}
            className="p-1.5 text-gray-500 hover:text-event-navy hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-input)] transition-colors"
          >
            <Wallet size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.id, row.nama)}
            disabled={deletingId === row.id}
            className="p-1.5 text-gray-500 hover:text-pmi-red hover:bg-red-50 rounded-[var(--radius-input)] transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  const renderMobileCard = (row: PanitiaData) => (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-2">
      <div className="flex items-start gap-3 border-b border-[var(--color-border)] pb-2">
        <div className="relative w-12 h-12 shrink-0 border border-[var(--color-border)] rounded-[var(--radius-input)] overflow-hidden">
          <Image src={row.fotoUrl} alt={row.nama} fill className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-body font-semibold text-event-navy">{row.nama}</p>
          <p className="font-body text-xs text-gray-400">{row.nomorRegistrasi}</p>
        </div>
        <Badge variant={row.status === 'HADIR' ? 'success' : 'info'}>{row.status}</Badge>
        <button
          onClick={() => openEdit(row)}
          aria-label={`Edit ${row.nama}`}
          className="p-1.5 text-gray-500 hover:text-event-navy hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-input)] transition-colors shrink-0"
        >
          <Pencil size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[11px] font-body">
        <span className="text-gray-400">Unit:</span>
        <span className="font-medium text-event-navy">{findLabel(ASAL_UNIT_OPTIONS, row.asalUnit)}</span>
        <span className="text-gray-400">Divisi:</span>
        <span className="font-medium text-event-navy">{findLabel(DIVISI_OPTIONS, row.divisi)}</span>
        <span className="text-gray-400">No. WhatsApp:</span>
        <span className="font-medium text-event-navy">{row.noWhatsapp}</span>
        <span className="text-gray-400">Perdiem:</span>
        <span className="font-medium text-event-navy">{formatRp(row.perdiem ?? 0)}</span>
      </div>
      {sesiList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sesiList.map((sesi) => {
            const hadir = row.absensiLogs.some((l) => l.sesiId === sesi.id)
            return (
              <span
                key={sesi.id}
                title={sesi.nama}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-medium ${
                  hadir ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {hadir ? <Check size={11} /> : <X size={11} />}
                {sesi.nama}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
<div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Cari nama atau nomor registrasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            placeholder="Semua Unit"
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            options={[...ASAL_UNIT_OPTIONS]}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            placeholder="Semua Divisi"
            value={filterDivisi}
            onChange={(e) => setFilterDivisi(e.target.value)}
            options={[...DIVISI_OPTIONS]}
          />
        </div>
        <Button variant="primary" onClick={() => setIsAddOpen(true)} className="flex items-center gap-1.5">
          <UserPlus size={14} />
          Tambah Panitia
        </Button>
        <Button variant="secondary" onClick={() => setIsKuotaOpen(true)} className="flex items-center gap-1.5">
          <Settings size={14} />
          Atur Kuota Divisi
        </Button>
        <Button variant="secondary" onClick={handleExportCsv} className="flex items-center gap-1.5">
          <FileDown size={14} />
          Export CSV
        </Button>
        <Button variant="primary" onClick={handleExportExcel} className="flex items-center gap-1.5">
          <FileSpreadsheet size={14} />
          Export Excel per Divisi
        </Button>
        <Button variant="secondary" onClick={() => handleExportLengkap('excel')} className="flex items-center gap-1.5">
          <FileSpreadsheet size={14} />
          Excel Tabel
        </Button>
        <Button variant="outline" onClick={() => handleExportLengkap('pdf')} className="flex items-center gap-1.5">
          <FileDown size={14} />
          PDF Tabel
        </Button>
        <Button variant="secondary" onClick={() => setIsBulkPerdiemOpen(true)} className="flex items-center gap-1.5">
          <Wallet size={14} />
          Perdiem Massal
        </Button>
        <Button variant="primary" onClick={handleExportIdCard} className="flex items-center gap-1.5">
          <CreditCard size={14} />
          ID Card PDF
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white py-12 flex flex-col items-center justify-center gap-2">
          <Search size={24} className="text-gray-300" />
          <p className="font-body text-sm text-gray-400">Tidak ada data yang cocok</p>
        </div>
      ) : (
        <ResponsiveTable columns={columns} data={filtered} renderMobileCard={renderMobileCard} />
      )}

      <p className="font-body text-xs text-gray-400">
        Menampilkan {filtered.length} dari {data.length} total panitia terdaftar
      </p>

      {/* Kirim sesiList ke Modal Detail Panitia */}
      <PanitiaDetailModal
        panitia={selected}
        sesiList={sesiList}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <PanitiaEditModal
        key={editing?.id ?? 'tutup'}
        panitia={editing}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaved={handleSaved}
      />
      <PanitiaAddModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSaved={handleAdded}
      />
      <PanitiaKuotaModal
        isOpen={isKuotaOpen}
        onClose={() => setIsKuotaOpen(false)}
      />
      <PanitiaPerdiemModal
        key={perdiemTarget?.id ?? 'tutup'}
        panitia={perdiemTarget}
        isOpen={isPerdiemOpen}
        onClose={() => setIsPerdiemOpen(false)}
        onSaved={handlePerdiemSaved}
      />
      <PanitiaPerdiemBulkModal
        key={isBulkPerdiemOpen ? 'bulk-buka' : 'bulk-tutup'}
        ids={filtered.map((p) => p.id)}
        isOpen={isBulkPerdiemOpen}
        onClose={() => setIsBulkPerdiemOpen(false)}
        onSaved={handleBulkPerdiemSaved}
      />
    </div>
  )
}
