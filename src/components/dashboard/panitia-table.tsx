'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Search, Eye, Trash2, FileDown, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ASAL_UNIT_OPTIONS, DIVISI_OPTIONS } from '@/lib/constants'
import { PanitiaDetailModal, type PanitiaData, type SesiRingkas } from './panitia-detail-modal'

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
    const sesiHeaders = sesiList.map((s) => s.nama)
    const headers = [
      'No Registrasi', 'Nama', 'Gender', 'WhatsApp', 'Alamat', 'Asal Unit', 'Divisi', 'Status',
      ...sesiHeaders,
    ]
    const rows = filtered.map((p) => [
      p.nomorRegistrasi,
      p.nama,
      p.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
      p.noWhatsapp,
      p.alamat.replace(/,/g, ';'),
      findLabel(ASAL_UNIT_OPTIONS, p.asalUnit),
      findLabel(DIVISI_OPTIONS, p.divisi),
      p.status,
      ...sesiList.map((s) => (p.absensiLogs.some((l) => l.sesiId === s.id) ? 'Hadir' : 'Tidak Hadir')),
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
        <div className="flex gap-3">
          <div className="flex-1 sm:w-48">
            <Select
              placeholder="Semua Unit"
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              options={[...ASAL_UNIT_OPTIONS]}
            />
          </div>
          <div className="flex-1 sm:w-48">
            <Select
              placeholder="Semua Divisi"
              value={filterDivisi}
              onChange={(e) => setFilterDivisi(e.target.value)}
              options={[...DIVISI_OPTIONS]}
            />
          </div>
        </div>
        <Button
          variant="accent"
          onClick={handleExportCsv}
          className="flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <FileDown size={16} />
          Export CSV
        </Button>
      </div>

      {filtered.length === 0 && (
        <div className="border-3 border-event-navy bg-white py-12 flex flex-col items-center gap-2">
          <Search size={24} className="text-event-navy/30" />
          <p className="font-body text-sm text-event-navy/50">Tidak ada data yang cocok</p>
        </div>
      )}

      {/* MOBILE: Card List */}
      {filtered.length > 0 && (
        <div className="md:hidden flex flex-col gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="border-3 border-event-blue bg-white p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 border-2 border-event-navy overflow-hidden shrink-0">
                  <Image src={p.fotoUrl} alt={p.nama} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-body font-bold text-sm text-event-navy truncate">{p.nama}</p>
                  <p className="font-body text-[11px] text-event-navy/60">{p.nomorRegistrasi}</p>
                </div>
                <Badge variant={p.status === 'HADIR' ? 'success' : 'info'}>{p.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-body">
                <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                  <span className="text-event-navy/50 block">Unit</span>
                  <span className="text-event-navy font-bold truncate block">
                    {findLabel(ASAL_UNIT_OPTIONS, p.asalUnit)}
                  </span>
                </div>
                <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                  <span className="text-event-navy/50 block">Divisi</span>
                  <span className="text-event-navy font-bold truncate block">
                    {findLabel(DIVISI_OPTIONS, p.divisi)}
                  </span>
                </div>
              </div>

              {sesiList.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {sesiList.map((sesi, i) => {
                    const hadir = p.absensiLogs.some((l) => l.sesiId === sesi.id)
                    return (
                      <div
                        key={sesi.id}
                        className={`flex items-center gap-1 px-2 py-1 border-2 border-event-navy text-[10px] font-body font-bold ${
                          hadir ? 'bg-green-500 text-white' : 'bg-event-navy/5 text-event-navy/40'
                        }`}
                      >
                        {hadir ? <Check size={10} /> : <X size={10} />}
                        Hari {i + 1}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => openDetail(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-event-blue text-white border-2 border-event-navy font-body font-bold text-xs"
                >
                  <Eye size={14} />
                  Detail
                </button>
                <button
                  onClick={() => handleDelete(p.id, p.nama)}
                  disabled={deletingId === p.id}
                  className="w-11 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DESKTOP: Table */}
      {filtered.length > 0 && (
        <div className="hidden md:block border-3 border-event-navy overflow-x-auto bg-white">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-event-pink text-white">
                <th className="font-body text-xs text-left px-4 py-3 w-16">Foto</th>
                <th className="font-body text-xs text-left px-4 py-3">No. Registrasi</th>
                <th className="font-body text-xs text-left px-4 py-3">Nama</th>
                <th className="font-body text-xs text-left px-4 py-3">Unit</th>
                <th className="font-body text-xs text-left px-4 py-3">Divisi</th>
                {sesiList.map((sesi, i) => (
                  <th
                    key={sesi.id}
                    className="font-body text-xs text-center px-3 py-3 w-20"
                    title={sesi.nama}
                  >
                    Hari {i + 1}
                  </th>
                ))}
                <th className="font-body text-xs text-center px-4 py-3 w-28">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-t-2 border-event-navy/10 transition-colors hover:bg-event-blue/5 ${
                    i % 2 === 1 ? 'bg-event-cream/40' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="relative w-10 h-10 border-2 border-event-navy overflow-hidden shrink-0">
                      <Image src={p.fotoUrl} alt={p.nama} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-event-navy/70">{p.nomorRegistrasi}</td>
                  <td className="px-4 py-3 font-body text-sm font-bold text-event-navy">{p.nama}</td>
                  <td className="px-4 py-3 font-body text-xs text-event-navy">
                    {findLabel(ASAL_UNIT_OPTIONS, p.asalUnit)}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-event-navy">
                    {findLabel(DIVISI_OPTIONS, p.divisi)}
                  </td>
                  {sesiList.map((sesi) => {
                    const hadir = p.absensiLogs.some((l) => l.sesiId === sesi.id)
                    return (
                      <td key={sesi.id} className="px-3 py-3">
                        <div className="flex justify-center">
                          <div
                            className={`w-6 h-6 flex items-center justify-center border-2 border-event-navy ${
                              hadir ? 'bg-green-500' : 'bg-event-navy/10'
                            }`}
                            title={hadir ? 'Hadir' : 'Belum absen'}
                          >
                            {hadir ? (
                              <Check size={12} className="text-white" />
                            ) : (
                              <X size={12} className="text-event-navy/30" />
                            )}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openDetail(p)}
                        className="w-8 h-8 flex items-center justify-center bg-event-blue text-white border-2 border-event-navy hover:bg-event-blue-dark transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.nama)}
                        disabled={deletingId === p.id}
                        className="w-8 h-8 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy hover:bg-red-700 transition-colors disabled:opacity-50"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sesiList.length > 0 && (
        <p className="font-body text-[11px] text-event-navy/50">
          {sesiList.map((s, i) => `Hari ${i + 1} = ${s.nama}`).join(' · ')}
        </p>
      )}

      <p className="font-body text-xs text-event-navy/60">
        Menampilkan {filtered.length} dari {data.length} total panitia terdaftar
      </p>

      <PanitiaDetailModal
        panitia={selected}
        sesiList={sesiList}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}