'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { RIWAYAT_PENYAKIT_OPTIONS, RIWAYAT_PENYAKIT_PERLU_PERHATIAN } from '@/lib/constants-sekolah'

interface Row {
  id: string
  noPeserta: string
  namaLengkap: string
  sekolahNama: string
  kategori: string
  tempatLahir: string
  tanggalLahir: string
  alamat: string
  agama: string
  golonganDarah: string
  tahunMasuk: number
  noHp: string | null
  gender: string
  riwayatPenyakit: string | null
  fotoUrl: string | null
}

interface SekolahOption {
  id: string
  namaLengkap: string
  kategori: string
  nomorPendaftaran: number | null
}

function findRiwayatLabel(value: string | null) {
  if (!value) return '-'
  return RIWAYAT_PENYAKIT_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function KomandanPesertaPendampingDashboard({
  tipe,
  sekolahOptions,
}: {
  tipe: 'PESERTA' | 'PENDAMPING'
  sekolahOptions: SekolahOption[]
}) {
  const PAGE_SIZE = 50
  const [tab, setTab] = useState<'WIRA' | 'MADYA'>('WIRA')
  const [data, setData] = useState<Row[]>([])
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
        const params = new URLSearchParams({ tipe, kategori: tab, page: String(page), pageSize: String(PAGE_SIZE), search: debouncedSearch })
        if (filterSekolah) params.set('sekolahId', filterSekolah)
        const res = await fetch(`/api/peserta/list?${params.toString()}`)
        const result = await res.json()
        if (result.success) {
          const allData: Row[] = result.data
          const fullTotal: number = result.pagination?.total ?? allData.length
          const halfTotal = Math.floor(fullTotal / 2)
          const halfData = allData.slice(0, Math.ceil(allData.length / 2))
          setData(halfData)
          setTotal(halfTotal)
        }
      } finally {
        setIsLoading(false)
      }
    }
    void fetchData()
  }, [tipe, tab, filterSekolah, page, debouncedSearch])

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

  function handleDownload(withPhoto: boolean) {
    if (withPhoto) {
      const ok = window.confirm(
        'Ekspor ini menyertakan FOTO dan RIWAYAT KESEHATAN peserta (data pribadi). Pastikan Anda berwenang dan menyimpannya dengan aman. Lanjutkan?'
      )
      if (!ok) return
    }
    const params = new URLSearchParams({ tipe, kategori: tab, withPhoto: String(withPhoto) })
    if (filterSekolah) params.set('sekolahId', filterSekolah)
    window.open(`/api/peserta/export?${params.toString()}`, '_blank')
  }

  const columns: ResponsiveTableColumn<Row>[] = [
    {
      key: 'no',
      header: `No ${tipe === 'PESERTA' ? 'Peserta' : 'Pendamping'}`,
      width: '120px',
      render: (row) => <span className="font-medium text-gray-600">{row.noPeserta}</span>,
    },
    {
      key: 'nama',
      header: 'Nama Lengkap',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-event-navy">{row.namaLengkap}</span>
          {tipe === 'PESERTA' &&
            row.riwayatPenyakit &&
            RIWAYAT_PENYAKIT_PERLU_PERHATIAN.includes(row.riwayatPenyakit) && (
              <span title={findRiwayatLabel(row.riwayatPenyakit)} className="text-pmi-red font-bold text-xs cursor-help">
                ⚠️
              </span>
            )}
        </div>
      ),
    },
    { key: 'sekolah', header: 'Sekolah', render: (row) => <span className="text-gray-500 text-sm">{row.sekolahNama}</span> },
    {
      key: 'ttl',
      header: 'Tempat, Tgl Lahir',
      render: (row) => (
        <span className="text-gray-600">
          {row.tempatLahir}, {new Date(row.tanggalLahir).toLocaleDateString('id-ID')}
        </span>
      ),
    },
    { key: 'alamat', header: 'Alamat', render: (row) => <span className="text-gray-600">{row.alamat}</span> },
    {
      key: 'gender',
      header: 'Gender',
      align: 'center',
      render: (row) => <span className="text-gray-600">{row.gender === 'LAKI_LAKI' ? 'L' : 'P'}</span>,
    },
  ]

  const renderMobileCard = (row: Row) => (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3 border-b border-[var(--color-border)] pb-2">
        {tipe === 'PESERTA' && row.fotoUrl && (
          <div className="relative w-12 h-14 shrink-0 border border-[var(--color-border)] rounded-[var(--radius-input)] overflow-hidden">
            <Image src={row.fotoUrl} alt={row.namaLengkap} fill className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-body text-[10px] text-gray-400">{row.noPeserta}</p>
          <div className="flex items-center gap-1.5">
            <p className="font-body font-semibold text-event-navy truncate">{row.namaLengkap}</p>
            {tipe === 'PESERTA' &&
              row.riwayatPenyakit &&
              RIWAYAT_PENYAKIT_PERLU_PERHATIAN.includes(row.riwayatPenyakit) && (
                <span title={findRiwayatLabel(row.riwayatPenyakit)} className="text-pmi-red font-bold text-xs">
                  ⚠️
                </span>
              )}
          </div>
          <p className="font-body text-xs text-gray-400">{row.sekolahNama}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-body">
        <div className="bg-[var(--color-surface-muted)] px-2 py-1.5 rounded-[var(--radius-input)]">
          <span className="text-gray-400 block">Tempat, Tgl Lahir</span>
          <span className="font-medium text-event-navy block truncate">
            {row.tempatLahir}, {new Date(row.tanggalLahir).toLocaleDateString('id-ID')}
          </span>
        </div>
        <div className="bg-[var(--color-surface-muted)] px-2 py-1.5 rounded-[var(--radius-input)]">
          <span className="text-gray-400 block">Gender</span>
          <span className="font-medium text-event-navy block">{row.gender === 'LAKI_LAKI' ? 'L' : 'P'}</span>
        </div>
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
          <Input placeholder="Cari nama peserta..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" onClick={() => handleDownload(false)} className="flex items-center gap-1.5">
          <Download size={14} />
          Excel Tanpa Foto
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white py-12 flex flex-col items-center justify-center gap-2">
          <Search size={24} className="text-gray-300" />
          <p className="font-body text-sm text-gray-400">Tidak ada data</p>
        </div>
      ) : (
        <ResponsiveTable columns={columns} data={data} renderMobileCard={renderMobileCard} />
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-body text-xs text-gray-400">
          Menampilkan {data.length} dari {total} total {tipe === 'PESERTA' ? 'peserta' : 'pendamping'}
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
