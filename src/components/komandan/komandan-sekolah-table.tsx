'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { SekolahStats } from '@/components/dashboard/sekolah-stats'

interface SekolahListItem {
  id: string
  nomorPendaftaran: number | null
  namaLengkap: string
  kodePendaftaran: string | null
  jenjang: string
  kategori: string
  namaPembina: string
  jumlahPeserta: number
  jumlahPendamping: number
  jumlahTenda: number
  sudahCetak: boolean
  pembayaranPeserta: { id: string; status: string; jumlahBiaya: number; statusDaftarUlang: boolean; buktiTransferUrl: string | null; kwitansiUrl: string | null } | null
  pembayaranTenda: { id: string; status: string; jumlahBiaya: number; buktiTransferUrl: string | null; kwitansiUrl: string | null } | null
}

export function KomandanSekolahTable({
  initialData,
  initialTotal,
  totalPeserta,
  totalPendamping,
  menungguKonfirmasi,
  sudahDaftarUlang,
  belumDaftarUlang,
}: {
  initialData: SekolahListItem[]
  initialTotal: number
  totalPeserta: number
  totalPendamping: number
  menungguKonfirmasi: number
  sudahDaftarUlang: number
  belumDaftarUlang: number
}) {
  const [wiraData, setWiraData] = useState<SekolahListItem[]>([])
  const [madyaData, setMadyaData] = useState<SekolahListItem[]>([])
  const [activeTab, setActiveTab] = useState<'WIRA' | 'MADYA'>('WIRA')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const firstRun = useRef(true)

  async function fetchAllData() {
    setLoading(true)
    try {
      const PAGE = 100
      let current = 1
      let allData: SekolahListItem[] = []
      while (true) {
        const params = new URLSearchParams({
          page: String(current),
          pageSize: String(PAGE),
          search: '',
          kategori: '',
          sortBy: 'nomor',
        })
        const res = await fetch(`/api/sekolah/list?${params}`)
        const result = await res.json()
        if (result.success) {
          allData = allData.concat(result.data)
          if (current >= result.pagination.totalPages) break
          current++
        } else {
          break
        }
      }
      setWiraData(allData.filter((s) => s.kategori === 'WIRA' && s.kodePendaftaran))
      setMadyaData(allData.filter((s) => s.kategori === 'MADYA' && s.kodePendaftaran))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      void fetchAllData()
    }
  }, [])

  const filteredList = (activeTab === 'WIRA' ? wiraData : madyaData).filter(
    (s) =>
      s.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
      (s.kodePendaftaran ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const columns: ResponsiveTableColumn<SekolahListItem>[] = [
    {
      key: 'kode',
      header: 'Kode Pendaftaran',
      render: (s) => <span className="text-gray-500 break-all">{s.kodePendaftaran ?? 'Tanpa kode'}</span>,
    },
    {
      key: 'nama',
      header: 'Nama Sekolah',
      render: (s) => <span className="font-semibold">{s.namaLengkap}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <SekolahStats
        totalSekolah={initialTotal}
        totalPeserta={totalPeserta}
        totalPendamping={totalPendamping}
        menungguKonfirmasi={menungguKonfirmasi}
        sudahDaftarUlang={sudahDaftarUlang}
        belumDaftarUlang={belumDaftarUlang}
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Cari nama sekolah atau kode pendaftaran..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-52">
          <Tabs
            tabs={[
              { key: 'WIRA', label: 'WIRA', badge: wiraData.length },
              { key: 'MADYA', label: 'MADYA', badge: madyaData.length },
            ]}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'WIRA' | 'MADYA')}
          />
        </div>
      </div>
      <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-event-navy" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Search size={24} className="text-gray-300" />
            <p className="font-body text-sm text-gray-400">Tidak ada data yang cocok</p>
          </div>
        ) : (
          <ResponsiveTable columns={columns} data={filteredList} />
        )}
      </div>
    </div>
  )
}
