'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { Badge } from '@/components/ui/badge'

interface SusulanRow {
  id: string
  namaLengkap: string
  kategori: string
  nomorPendaftaran: number | null
  kodePendaftaran: string | null
  jumlahPeserta: number
  jumlahPendamping: number
  batchTertinggi: number
  totalBiayaSusulan: number
  statusBayar: string
}

interface SekolahOption {
  id: string
  namaLengkap: string
  kategori: string
  nomorPendaftaran: number | null
}

function rp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'LUNAS' ? 'success' : status === 'MENUNGGU_KONFIRMASI' ? 'warning' : status === 'DITOLAK' ? 'danger' : 'default'
  const label = status === 'LUNAS' ? 'Lunas' : status === 'MENUNGGU_KONFIRMASI' ? 'Menunggu' : status === 'DITOLAK' ? 'Ditolak' : status
  return <Badge variant={variant}>{label}</Badge>
}

export function SusulanTable({ sekolahOptions }: { sekolahOptions: SekolahOption[] }) {
  const PAGE_SIZE = 50
  const [tab, setTab] = useState<'WIRA' | 'MADYA'>('WIRA')
  const [data, setData] = useState<SusulanRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterSekolah, setFilterSekolah] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterSekolah('')
      setPage(1)
    }, 0)
    return () => clearTimeout(timer)
  }, [tab])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          kategori: tab,
          page: String(page),
          pageSize: String(PAGE_SIZE),
          search: debouncedSearch,
        })
        if (filterSekolah) params.set('sekolahId', filterSekolah)
        const res = await fetch(`/api/susulan/list?${params.toString()}`)
        const result = await res.json()
        if (result.success) {
          setData(result.data)
          setTotal(result.pagination?.total ?? result.data.length)
        }
      } finally {
        setIsLoading(false)
      }
    }
    void fetchData()
  }, [tab, filterSekolah, page, debouncedSearch])

  const sekolahOptionsForTab = useMemo(
    () =>
      sekolahOptions
        .filter((s) => s.kategori === tab)
        .map((s) => ({
          value: s.id,
          label: `${s.nomorPendaftaran == null ? '-' : String(s.nomorPendaftaran).padStart(2, '0')} - ${s.namaLengkap}`,
        })),
    [sekolahOptions, tab]
  )

  const columns: ResponsiveTableColumn<SusulanRow>[] = [
    {
      key: 'no',
      header: 'No',
      width: '50px',
      align: 'center',
      render: (row) => {
        const idx = data.findIndex((d) => d.id === row.id)
        return <span className="text-gray-500">{(page - 1) * PAGE_SIZE + idx + 1}</span>
      },
    },
    {
      key: 'nama',
      header: 'Nama Sekolah',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-event-navy">{row.namaLengkap}</span>
          <span className="text-[10px] text-gray-400">{row.kodePendaftaran ?? 'Tanpa kode'}</span>
        </div>
      ),
    },
    {
      key: 'kategori',
      header: 'Kategori',
      align: 'center',
      render: (row) => <Badge variant="default">{row.kategori}</Badge>,
    },
    {
      key: 'peserta',
      header: 'Peserta',
      align: 'center',
      render: (row) => <span className="font-medium">{row.jumlahPeserta}</span>,
    },
    {
      key: 'pendamping',
      header: 'Pendamping',
      align: 'center',
      render: (row) => <span className="font-medium">{row.jumlahPendamping}</span>,
    },
    {
      key: 'batch',
      header: 'Batch',
      align: 'center',
      render: (row) => (
        <Badge variant="info">
          1 → {row.batchTertinggi}
        </Badge>
      ),
    },
    {
      key: 'biaya',
      header: 'Total Biaya Susulan',
      align: 'right',
      render: (row) => <span className="font-bold text-event-navy">{rp(row.totalBiayaSusulan)}</span>,
    },
    {
      key: 'status',
      header: 'Status Bayar',
      align: 'center',
      render: (row) => <StatusBadge status={row.statusBayar} />,
    },
  ]

  const renderMobileCard = (row: SusulanRow) => (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-3">
      <div>
        <p className="font-body font-semibold text-sm text-event-navy">{row.namaLengkap}</p>
        <p className="font-body text-[10px] text-gray-400">{row.kodePendaftaran ?? 'Tanpa kode'}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="default">{row.kategori}</Badge>
        <Badge variant="info">Batch 1 → {row.batchTertinggi}</Badge>
        <StatusBadge status={row.statusBayar} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-body">
        <div className="bg-[var(--color-surface-muted)] px-2 py-1.5 rounded-[var(--radius-input)]">
          <span className="text-gray-400 block">Peserta Susulan</span>
          <span className="font-medium text-event-navy block">{row.jumlahPeserta}</span>
        </div>
        <div className="bg-[var(--color-surface-muted)] px-2 py-1.5 rounded-[var(--radius-input)]">
          <span className="text-gray-400 block">Pendamping Susulan</span>
          <span className="font-medium text-event-navy block">{row.jumlahPendamping}</span>
        </div>
      </div>
      <div className="bg-[var(--color-surface-muted)] px-2 py-1.5 rounded-[var(--radius-input)] text-[11px]">
        <span className="text-gray-400 block">Total Biaya Susulan</span>
        <span className="font-bold text-event-navy block">{rp(row.totalBiayaSusulan)}</span>
      </div>
    </div>
  )

  if (isLoading) {
    return <p className="font-body text-sm text-gray-400 text-center py-8">Memuat data...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        tabs={[
          { key: 'WIRA', label: 'Wira' },
          { key: 'MADYA', label: 'Madya' },
        ]}
        activeKey={tab}
        onChange={(key) => setTab(key as 'WIRA' | 'MADYA')}
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Cari nama sekolah..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-64">
          <Select
            placeholder="Semua Sekolah"
            value={filterSekolah}
            onChange={(e) => {
              setFilterSekolah(e.target.value)
              setPage(1)
            }}
            options={sekolahOptionsForTab}
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white py-12 flex flex-col items-center justify-center gap-2">
          <Search size={24} className="text-gray-300" />
          <p className="font-body text-sm text-gray-400">Tidak ada sekolah dengan data susulan</p>
        </div>
      ) : (
        <ResponsiveTable columns={columns} data={data} renderMobileCard={renderMobileCard} />
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-body text-xs text-gray-400">
          Menampilkan {data.length} dari {total} total sekolah
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={14} /> Sebelumnya
          </Button>
          <span className="font-body text-xs text-gray-500">
            Halaman {page} dari {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
            Berikutnya <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
