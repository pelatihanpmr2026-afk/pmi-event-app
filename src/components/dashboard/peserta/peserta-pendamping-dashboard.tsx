'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Download, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
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
  nomorPendaftaran: number
}

function findRiwayatLabel(value: string | null) {
  if (!value) return '-'
  return RIWAYAT_PENYAKIT_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function PesertaPendampingDashboard({
  tipe,
  sekolahOptions,
}: {
  tipe: 'PESERTA' | 'PENDAMPING'
  sekolahOptions: SekolahOption[]
}) {
  const [tab, setTab] = useState<'WIRA' | 'MADYA'>('WIRA')
  const [data, setData] = useState<Row[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSekolah, setFilterSekolah] = useState('')

 useEffect(() => {
    const timer = setTimeout(() => setFilterSekolah(''), 0)
    return () => clearTimeout(timer)
  }, [tab])

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ tipe, kategori: tab })
        if (filterSekolah) params.set('sekolahId', filterSekolah)
        const res = await fetch(`/api/peserta/list?${params.toString()}`)
        const result = await res.json()
        if (result.success) setData(result.data)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [tipe, tab, filterSekolah])

  const filtered = useMemo(
    () => data.filter((p) => search.trim() === '' || p.namaLengkap.toLowerCase().includes(search.toLowerCase())),
    [data, search]
  )

  const sekolahOptionsForTab = useMemo(
    () =>
      sekolahOptions
        .filter((s) => s.kategori === tab)
        .map((s) => ({
          value: s.id,
          label: `${String(s.nomorPendaftaran).padStart(2, '0')} - ${s.namaLengkap}`,
        })),
    [sekolahOptions, tab]
  )

  function handleDownload(withPhoto: boolean) {
    const params = new URLSearchParams({ tipe, kategori: tab, withPhoto: String(withPhoto) })
    if (filterSekolah) params.set('sekolahId', filterSekolah)
    window.open(`/api/peserta/export?${params.toString()}`, '_blank')
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
          <Input placeholder="Cari nama..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-64">
          <Select
            placeholder="Semua Sekolah"
            value={filterSekolah}
            onChange={(e) => setFilterSekolah(e.target.value)}
            options={sekolahOptionsForTab}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => handleDownload(false)} className="flex items-center gap-1.5">
          <Download size={14} />
          Excel Tanpa Foto
        </Button>
        {tipe === 'PESERTA' && (
          <Button variant="primary" onClick={() => handleDownload(true)} className="flex items-center gap-1.5">
            <Download size={14} />
            Excel Dengan Foto
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-event-navy/50 text-center py-8">Memuat data...</p>
      ) : filtered.length === 0 ? (
        <div className="border-3 border-event-navy bg-white py-12 flex flex-col items-center gap-2">
          <Search size={24} className="text-event-navy/30" />
          <p className="font-body text-sm text-event-navy/50">Tidak ada data</p>
        </div>
      ) : (
        <div className="border-3 border-event-navy overflow-x-auto bg-white">
          <table className="w-full" style={{ minWidth: tipe === 'PESERTA' ? '1500px' : '1200px' }}>
            <thead>
              <tr className="bg-event-navy text-white">
                <th className="font-body text-xs px-3 py-3 text-left w-24">No {tipe === 'PESERTA' ? 'Peserta' : 'Pendamping'}</th>
                {tipe === 'PESERTA' && <th className="font-body text-xs px-3 py-3 w-16">Foto</th>}
                <th className="font-body text-xs px-3 py-3 text-left">Nama</th>
                <th className="font-body text-xs px-3 py-3 text-left">Sekolah</th>
                <th className="font-body text-xs px-3 py-3 text-left">Tempat, Tgl Lahir</th>
                <th className="font-body text-xs px-3 py-3 text-left">Alamat</th>
                <th className="font-body text-xs px-3 py-3 text-center">Agama</th>
                <th className="font-body text-xs px-3 py-3 text-center">Gol. Darah</th>
                <th className="font-body text-xs px-3 py-3 text-center">Thn Masuk</th>
                <th className="font-body text-xs px-3 py-3 text-left">No. HP</th>
                <th className="font-body text-xs px-3 py-3 text-center">Gender</th>
                {tipe === 'PESERTA' && <th className="font-body text-xs px-3 py-3 text-left">Riwayat Penyakit</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={`border-t-2 border-event-navy/10 ${i % 2 === 1 ? 'bg-event-cream/40' : ''}`}>
                  <td className="px-3 py-2.5 font-body text-xs font-bold text-event-navy">{p.noPeserta}</td>
                  {tipe === 'PESERTA' && (
                    <td className="px-3 py-2.5">
                      {p.fotoUrl && (
                        <div className="relative w-9 h-9 border-2 border-event-navy overflow-hidden mx-auto">
                          <Image src={p.fotoUrl} alt={p.namaLengkap} fill className="object-cover" />
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2.5 font-body text-sm font-bold text-event-navy">
                    <div className="flex items-center gap-1.5">
                      {p.namaLengkap}
                      {tipe === 'PESERTA' &&
                        p.riwayatPenyakit &&
                        RIWAYAT_PENYAKIT_PERLU_PERHATIAN.includes(p.riwayatPenyakit) && (
                          <span title={findRiwayatLabel(p.riwayatPenyakit)} className="text-pmi-red text-xs">
                            ⚠️
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-body text-xs text-event-navy">{p.sekolahNama}</td>
                  <td className="px-3 py-2.5 font-body text-xs text-event-navy">
                    {p.tempatLahir}, {new Date(p.tanggalLahir).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5 font-body text-xs text-event-navy max-w-[200px] truncate">{p.alamat}</td>
                  <td className="px-3 py-2.5 text-center font-body text-xs text-event-navy">{p.agama}</td>
                  <td className="px-3 py-2.5 text-center font-body text-xs text-event-navy">{p.golonganDarah}</td>
                  <td className="px-3 py-2.5 text-center font-body text-xs text-event-navy">{p.tahunMasuk}</td>
                  <td className="px-3 py-2.5 font-body text-xs text-event-navy">{p.noHp || '-'}</td>
                  <td className="px-3 py-2.5 text-center font-body text-xs text-event-navy">
                    {p.gender === 'LAKI_LAKI' ? 'L' : 'P'}
                  </td>
                  {tipe === 'PESERTA' && (
                    <td className="px-3 py-2.5 font-body text-xs text-event-navy">
                      {findRiwayatLabel(p.riwayatPenyakit)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-body text-xs text-event-navy/60">Menampilkan {filtered.length} data</p>
    </div>
  )
}