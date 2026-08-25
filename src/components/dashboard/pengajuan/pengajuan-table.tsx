'use client'

import { useState, useMemo } from 'react'
import { Search, Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { DIVISI_OPTIONS } from '@/lib/constants'
import { PengajuanDetailModal } from './pengajuan-detail-modal'

interface PengajuanListItem {
  id: string
  nomorPengajuan: string
  namaKoordinator: string
  divisi: string
  noHp: string
  totalJenisBarang: number
  totalKuantitas: number
  totalPengajuan: number
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  createdAt: string
}

const STATUS_CONFIG = {
  MENUNGGU: { label: 'Menunggu', variant: 'warning' as const },
  DISETUJUI: { label: 'Disetujui', variant: 'success' as const },
  DITOLAK: { label: 'Ditolak', variant: 'danger' as const },
}

export function PengajuanTable({ initialData }: { initialData: PengajuanListItem[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [filterDivisi, setFilterDivisi] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filtered = useMemo(() => {
    return data.filter((p) => {
      const matchSearch =
        search.trim() === '' ||
        p.namaKoordinator.toLowerCase().includes(search.toLowerCase()) ||
        p.nomorPengajuan.toLowerCase().includes(search.toLowerCase())
      const matchDivisi = filterDivisi === '' || p.divisi === filterDivisi
      const matchStatus = filterStatus === '' || p.status === filterStatus
      return matchSearch && matchDivisi && matchStatus
    })
  }, [data, search, filterDivisi, filterStatus])

  function openDetail(id: string) {
    setSelectedId(id)
    setIsModalOpen(true)
  }

  async function refresh() {
    const res = await fetch('/api/pengajuan-anggaran/list')
    const result = await res.json()
    if (result.success) setData(result.data)
  }

  const columns: ResponsiveTableColumn<PengajuanListItem>[] = [
    {
      key: 'no',
      header: 'No. Pengajuan',
      render: (row) => <span className="font-medium text-gray-600">{row.nomorPengajuan}</span>,
    },
    {
      key: 'koordinator',
      header: 'Koordinator',
      render: (row) => <span className="font-semibold">{row.namaKoordinator}</span>,
    },
    {
      key: 'divisi',
      header: 'Divisi',
      render: (row) => (
        <span className="text-gray-500">
          {DIVISI_OPTIONS.find((d) => d.value === row.divisi)?.label ?? row.divisi}
        </span>
      ),
    },
    {
      key: 'jenis',
      header: 'Jenis Barang',
      align: 'center',
      render: (row) => row.totalJenisBarang,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (row) => <span className="font-medium">Rp{row.totalPengajuan.toLocaleString('id-ID')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <Badge variant={STATUS_CONFIG[row.status].variant}>{STATUS_CONFIG[row.status].label}</Badge>,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      hideOnMobile: true,
      render: (row) => (
        <button
          onClick={() => openDetail(row.id)}
          className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-btn)] border border-[var(--color-border)] text-gray-400 hover:text-event-navy hover:bg-[var(--color-surface-muted)] transition-colors"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ]

  const renderMobileCard = (row: PengajuanListItem) => (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-body font-semibold text-event-navy">{row.namaKoordinator}</p>
          <p className="font-body text-xs text-gray-400">{row.nomorPengajuan}</p>
        </div>
        <Badge variant={STATUS_CONFIG[row.status].variant}>{STATUS_CONFIG[row.status].label}</Badge>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-body border-t border-[var(--color-border)] pt-2 mt-1">
        <Badge variant="default">
          {DIVISI_OPTIONS.find((d) => d.value === row.divisi)?.label ?? row.divisi}
        </Badge>
        <span className="font-medium text-gray-600">
          {row.totalJenisBarang} jenis · Rp{row.totalPengajuan.toLocaleString('id-ID')}
        </span>
      </div>
      <div className="flex justify-end pt-1">
        <button
          onClick={() => openDetail(row.id)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-btn)] bg-event-blue text-white text-xs font-medium hover:bg-event-blue-dark transition-colors"
        >
          <Eye size={14} />
          Lihat Detail
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Cari nama koordinator atau nomor pengajuan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        <div className="w-full sm:w-48">
          <Select
            placeholder="Semua Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'MENUNGGU', label: 'Menunggu' },
              { value: 'DISETUJUI', label: 'Disetujui' },
              { value: 'DITOLAK', label: 'Ditolak' },
            ]}
          />
        </div>
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
        Menampilkan {filtered.length} dari {data.length} total pengajuan
      </p>

      <PengajuanDetailModal
        pengajuanId={selectedId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProcessed={refresh}
      />
    </div>
  )
}