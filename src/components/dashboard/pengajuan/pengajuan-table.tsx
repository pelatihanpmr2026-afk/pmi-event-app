'use client'

import { useState, useMemo } from 'react'
import { Search, Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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

      {filtered.length === 0 && (
        <div className="border-3 border-event-navy bg-white py-12 flex flex-col items-center gap-2">
          <Search size={24} className="text-event-navy/30" />
          <p className="font-body text-sm text-event-navy/50">Tidak ada data yang cocok</p>
        </div>
      )}

      {/* MOBILE */}
      {filtered.length > 0 && (
        <div className="md:hidden flex flex-col gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="border-3 border-event-navy bg-white p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-body font-bold text-sm text-event-navy">{p.namaKoordinator}</p>
                  <p className="font-body text-[11px] text-event-navy/60">{p.nomorPengajuan}</p>
                </div>
                <Badge variant={STATUS_CONFIG[p.status].variant}>{STATUS_CONFIG[p.status].label}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default">{DIVISI_OPTIONS.find((d) => d.value === p.divisi)?.label}</Badge>
                <span className="font-body text-[11px] text-event-navy/60">
                  {p.totalJenisBarang} jenis · Rp{p.totalPengajuan.toLocaleString('id-ID')}
                </span>
              </div>
              <button
                onClick={() => openDetail(p.id)}
                className="flex items-center justify-center gap-1.5 py-2 bg-event-blue text-white border-2 border-event-navy font-body font-bold text-xs"
              >
                <Eye size={14} />
                Lihat Detail
              </button>
            </div>
          ))}
        </div>
      )}

      {/* DESKTOP */}
      {filtered.length > 0 && (
        <div className="hidden md:block border-3 border-event-navy overflow-x-auto bg-white">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-event-navy text-white">
                <th className="font-body text-xs text-left px-4 py-3">Nomor</th>
                <th className="font-body text-xs text-left px-4 py-3">Koordinator</th>
                <th className="font-body text-xs text-left px-4 py-3">Divisi</th>
                <th className="font-body text-xs text-center px-4 py-3">Jenis Barang</th>
                <th className="font-body text-xs text-right px-4 py-3">Total</th>
                <th className="font-body text-xs text-center px-4 py-3">Status</th>
                <th className="font-body text-xs text-center px-4 py-3 w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-t-2 border-event-navy/10 hover:bg-event-blue/5 ${
                    i % 2 === 1 ? 'bg-event-cream/40' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-body text-xs text-event-navy/70">{p.nomorPengajuan}</td>
                  <td className="px-4 py-3 font-body text-sm font-bold text-event-navy">{p.namaKoordinator}</td>
                  <td className="px-4 py-3 font-body text-xs text-event-navy">
                    {DIVISI_OPTIONS.find((d) => d.value === p.divisi)?.label}
                  </td>
                  <td className="px-4 py-3 text-center font-body text-xs text-event-navy">{p.totalJenisBarang}</td>
                  <td className="px-4 py-3 text-right font-body text-xs font-bold text-event-navy">
                    Rp{p.totalPengajuan.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_CONFIG[p.status].variant}>{STATUS_CONFIG[p.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <button
                        onClick={() => openDetail(p.id)}
                        className="w-8 h-8 flex items-center justify-center bg-event-blue text-white border-2 border-event-navy hover:bg-event-blue-dark transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-body text-xs text-event-navy/60">
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