'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, FileText, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'

interface SusulanSekolahItem {
  id: string
  namaLengkap: string
  kodePendaftaran: string | null
  kategori: string
  jumlahPeserta: number
  jumlahPendamping: number
  batchTertinggi: number
  totalBiayaSusulan: number
  statusBayar: string
}

export function SusulanSekolahTable() {
  const [wiraData, setWiraData] = useState<SusulanSekolahItem[]>([])
  const [madyaData, setMadyaData] = useState<SusulanSekolahItem[]>([])
  const [activeTab, setActiveTab] = useState<'WIRA' | 'MADYA'>('WIRA')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const firstRun = useRef(true)

  async function fetchData() {
    setLoading(true)
    try {
      const PAGE = 100
      let current = 1
      let allData: SusulanSekolahItem[] = []
      while (true) {
        const params = new URLSearchParams({
          page: String(current),
          pageSize: String(PAGE),
          kategori: '',
          sortBy: 'nomor',
        })
        const res = await fetch(`/api/susulan/list?${params}`)
        const result = await res.json()
        if (result.success) {
          const items: SusulanSekolahItem[] = result.data
          allData = allData.concat(items)
          if (current >= result.pagination.totalPages) break
          current++
        } else {
          break
        }
      }
      setWiraData(allData.filter((s) => s.kategori === 'WIRA'))
      setMadyaData(allData.filter((s) => s.kategori === 'MADYA'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      void fetchData()
    }
  }, [])

  async function handleGenerateKta(id: string) {
    setGeneratingId(id)
    try {
      window.open(`/api/sekolah/${id}/kta/susulan`, '_blank')
    } finally {
      setTimeout(() => setGeneratingId(null), 2000)
    }
  }

  const filteredList = (activeTab === 'WIRA' ? wiraData : madyaData).filter(
    (s) =>
      s.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
      (s.kodePendaftaran ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const columns: ResponsiveTableColumn<SusulanSekolahItem>[] = [
    {
      key: 'kode',
      header: 'Kode Pendaftaran',
      render: (s) => <span className="text-gray-500 break-all">{s.kodePendaftaran ?? 'Tanpa kode'}</span>,
    },
    {
      key: 'nama',
      header: 'Nama Sekolah',
      render: (s) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{s.namaLengkap}</span>
          <Badge variant="default">{s.kategori}</Badge>
        </div>
      ),
    },
    {
      key: 'peserta',
      header: 'Peserta Susulan',
      align: 'center',
      render: (s) => <span className="font-medium">{s.jumlahPeserta}</span>,
    },
    {
      key: 'pendamping',
      header: 'Pendamping Susulan',
      align: 'center',
      render: (s) => <span className="font-medium">{s.jumlahPendamping}</span>,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      hideOnMobile: true,
      render: (s) => (
        <button
          onClick={() => void handleGenerateKta(s.id)}
          disabled={generatingId === s.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-btn)] bg-event-blue text-white text-xs font-medium hover:bg-event-navy transition-colors disabled:opacity-50"
        >
          {generatingId === s.id ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileText size={14} />
          )}
          KTA Susulan
        </button>
      ),
    },
  ]

  const renderMobileCard = (row: SusulanSekolahItem) => (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-3">
      <div>
        <p className="font-body font-semibold text-sm text-event-navy">{row.namaLengkap}</p>
        <p className="font-body text-[10px] text-gray-400">{row.kodePendaftaran ?? 'Tanpa kode'}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="default">{row.kategori}</Badge>
        <span className="font-body text-[11px] text-gray-500">
          {row.jumlahPeserta} peserta · {row.jumlahPendamping} pendamping
        </span>
      </div>
      <button
        onClick={() => void handleGenerateKta(row.id)}
        disabled={generatingId === row.id}
        className="flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-btn)] bg-event-blue text-white text-xs font-medium hover:bg-event-navy transition-colors disabled:opacity-50"
      >
        {generatingId === row.id ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileText size={14} />
        )}
        Download KTA Susulan
      </button>
    </div>
  )

  if (loading) {
    return <p className="font-body text-sm text-gray-400 text-center py-8">Memuat data...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        tabs={[
          { key: 'WIRA', label: 'WIRA', badge: wiraData.length },
          { key: 'MADYA', label: 'MADYA', badge: madyaData.length },
        ]}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'WIRA' | 'MADYA')}
      />
      <div className="flex-1">
        <Input placeholder="Cari nama sekolah atau kode pendaftaran..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Search size={24} className="text-gray-300" />
            <p className="font-body text-sm text-gray-400">Tidak ada sekolah dengan data susulan</p>
          </div>
        ) : (
          <ResponsiveTable columns={columns} data={filteredList} renderMobileCard={renderMobileCard} />
        )}
      </div>
    </div>
  )
}
