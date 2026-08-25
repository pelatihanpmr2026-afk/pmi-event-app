'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { TransaksiFormModal, type TransaksiData } from './transaksi-form-modal'
import { DIVISI_OPTIONS } from '@/lib/constants'

function formatRp(n: number) {
  return n > 0 ? `Rp${n.toLocaleString('id-ID')}` : '-'
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function findDivisiLabel(value: string | null) {
  if (!value) return '-'
  return DIVISI_OPTIONS.find((d) => d.value === value)?.label ?? value
}

const JENIS_FILTER_OPTIONS = [
  { value: '', label: 'Semua Jenis' },
  { value: 'PEMASUKAN', label: 'Pemasukan' },
  { value: 'PENGELUARAN', label: 'Pengeluaran' },
  { value: 'UTANG', label: 'Utang' },
]

const SORTABLE_KEYS = new Set(['tanggal', 'uraian', 'debit', 'kredit', 'utang', 'saldo'])

export function TransaksiTable({ initialData }: { initialData: TransaksiData[] }) {
  const [data, setData] = useState(initialData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<TransaksiData | null>(null)
  const [search, setSearch] = useState('')
  const [jenisFilter, setJenisFilter] = useState('')
  const [sortKey, setSortKey] = useState('tanggal')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const visibleData = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = data

    if (q) {
      rows = rows.filter(
        (t) =>
          t.keterangan.toLowerCase().includes(q) ||
          t.uraian.toLowerCase().includes(q) ||
          (t.pic ?? '').toLowerCase().includes(q) ||
          findDivisiLabel(t.divisi).toLowerCase().includes(q) ||
          (t.nomorPengajuan ?? '').toLowerCase().includes(q)
      )
    }

    if (jenisFilter) {
      rows = rows.filter((t) => t.jenis === jenisFilter)
    }

    if (sortKey && SORTABLE_KEYS.has(sortKey)) {
      const dir = sortDir === 'asc' ? 1 : -1
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey as keyof TransaksiData]
        const bv = b[sortKey as keyof TransaksiData]
        if (sortKey === 'tanggal') {
          return (new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()) * dir
        }
        if (typeof av === 'number' && typeof bv === 'number') {
          return (av - bv) * dir
        }
        return String(av).localeCompare(String(bv)) * dir
      })
    }

    return rows
  }, [data, search, jenisFilter, sortKey, sortDir])

  async function refresh() {
    const res = await fetch('/api/keuangan/transaksi')
    const result = await res.json()
    if (result.success) setData(result.data)
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function openCreate() {
    setEditing(null)
    setIsModalOpen(true)
  }

  function openEdit(t: TransaksiData) {
    setEditing(t)
    setIsModalOpen(true)
  }

  async function handleDelete(id: string, keterangan: string) {
    if (!confirm(`Hapus transaksi "${keterangan}"?`)) return
    try {
      const res = await fetch(`/api/keuangan/transaksi/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menghapus transaksi')
      toast.success('Transaksi berhasil dihapus')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    }
  }

  const columns: ResponsiveTableColumn<TransaksiData>[] = [
    { key: 'tanggal', header: 'Tanggal', width: '120px', sortable: true, render: (row) => formatTanggal(row.tanggal) },
    { key: 'uraian', header: 'Uraian', sortable: true, render: (row) => <span className="font-semibold">{row.uraian}</span> },
    {
      key: 'keterangan',
      header: 'Keterangan',
      render: (row) => (
        <span className="flex items-center gap-2 text-gray-500">
          <span>{row.keterangan}</span>
          {row.pengajuanId && <Badge variant="warning">{row.nomorPengajuan ?? 'Pengajuan'}</Badge>}
        </span>
      ),
    },
    { key: 'debit', header: 'Debit', align: 'right', sortable: true, render: (row) => <span className="text-green-600 font-medium">{formatRp(row.debit)}</span> },
    { key: 'kredit', header: 'Kredit', align: 'right', sortable: true, render: (row) => <span className="text-pmi-red font-medium">{formatRp(row.kredit)}</span> },
    { key: 'utang', header: 'Utang', align: 'right', sortable: true, render: (row) => formatRp(row.utang) },
    { key: 'saldo', header: 'Saldo', align: 'right', sortable: true, render: (row) => <span className="font-bold">{formatRp(row.saldo)}</span> },
    { key: 'divisi', header: 'Divisi', render: (row) => findDivisiLabel(row.divisi) },
    { key: 'pic', header: 'PIC', render: (row) => row.pic || '-' },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      hideOnMobile: true,
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          {row.pengajuanId ? (
            <span className="text-[10px] text-gray-400">Otomatis</span>
          ) : (
            <>
              <button
                onClick={() => openEdit(row)}
                className="p-1.5 text-gray-500 hover:text-event-navy hover:bg-[var(--color-surface-muted)] rounded-[var(--radius-input)] transition-colors"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(row.id, row.keterangan)}
                className="p-1.5 text-gray-500 hover:text-pmi-red hover:bg-red-50 rounded-[var(--radius-input)] transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  // Mobile Card Render
  const renderMobileCard = (row: TransaksiData) => (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-body font-semibold text-event-navy">
            {row.uraian}
            {row.pengajuanId && (
              <Badge variant="warning" className="ml-2">
                {row.nomorPengajuan ?? 'Pengajuan'}
              </Badge>
            )}
          </p>
          <p className="font-body text-xs text-gray-400">{formatTanggal(row.tanggal)}</p>
        </div>
        <Badge variant={row.jenis === 'PEMASUKAN' ? 'success' : 'danger'}>
          {row.jenis === 'PEMASUKAN' ? 'Pemasukan' : 'Pengeluaran'}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-body border-t border-[var(--color-border)] pt-2 mt-1">
        <div>
          <span className="text-gray-400 block">Debit</span>
          <span className="font-medium text-green-600">{formatRp(row.debit)}</span>
        </div>
        <div>
          <span className="text-gray-400 block">Kredit</span>
          <span className="font-medium text-pmi-red">{formatRp(row.kredit)}</span>
        </div>
        <div>
          <span className="text-gray-400 block">Utang</span>
          <span className="font-medium text-event-navy">{formatRp(row.utang)}</span>
        </div>
        <div>
          <span className="text-gray-400 block">Saldo</span>
          <span className="font-medium text-event-navy">{formatRp(row.saldo)}</span>
        </div>
      </div>
      {row.divisi && (
        <div className="text-[10px] text-gray-400 border-t border-[var(--color-border)] pt-1 mt-1">
          {findDivisiLabel(row.divisi)} · {row.pic}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs text-event-navy">BUKU KAS</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-event-blue text-white rounded-[var(--radius-btn)] text-xs font-semibold hover:bg-event-blue-dark transition-colors"
        >
          <Plus size={14} />
          Tambah Transaksi
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Input
            placeholder="Cari keterangan, uraian, PIC, atau divisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="w-full sm:w-48">
          <Select value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value)} options={JENIS_FILTER_OPTIONS} />
        </div>
      </div>

      {visibleData.length === 0 ? (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white py-12 text-center">
          <p className="font-body text-sm text-gray-400">
            {data.length === 0 ? 'Belum ada transaksi tercatat' : 'Tidak ada transaksi yang cocok dengan filter'}
          </p>
        </div>
      ) : (
        <ResponsiveTable
          columns={columns}
          data={visibleData}
          renderMobileCard={renderMobileCard}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )}

      {visibleData.length > 0 && (
        <p className="font-body text-xs text-gray-400">
          Menampilkan {visibleData.length} dari {data.length} transaksi
        </p>
      )}

      <TransaksiFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editing={editing}
        onSaved={refresh}
      />
    </div>
  )
}