'use client'

import { useState, useEffect } from 'react'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

interface SewaRow {
  id: string
  namaSekolah: string
  kodePendaftaran: string | null
  tenda: { tendaJenisId: string; nama: string; jumlah: number }[]
  totalUnit: number
  totalBiaya: number
  tanggalSewa: string | null
}

interface TendaOption {
  id: string
  nama: string
  harga: number
  kapasitasMin: number
  kapasitasMax: number
  stokTersisa: number
}

function rp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function TendaSewaList() {
  const [data, setData] = useState<SewaRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<SewaRow | null>(null)
  const [tendaOptions, setTendaOptions] = useState<TendaOption[]>([])
  const [editJumlah, setEditJumlah] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)

  async function fetchData() {
    try {
      const res = await fetch('/api/tenda/sewa-list')
      const result = await res.json()
      if (result.success) setData(result.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  async function deleteSewa(row: SewaRow) {
    if (!window.confirm(`Hapus sewa tenda dari ${row.namaSekolah}? Data tenda dan pembayaran sewa terkait akan dihapus permanen.`)) return

    setDeletingId(row.id)
    try {
      const res = await fetch(`/api/sekolah/${row.id}/tenda`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menghapus sewa tenda')
      toast.success('Sewa tenda berhasil dihapus')
      await fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setDeletingId(null)
    }
  }

  async function openEdit(row: SewaRow) {
    try {
      const res = await fetch('/api/tenda')
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result?.message || 'Gagal memuat jenis tenda')
      setTendaOptions(result.data)
      setEditJumlah(Object.fromEntries(row.tenda.map((tenda) => [tenda.tendaJenisId, tenda.jumlah])))
      setEditingRow(row)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat jenis tenda')
    }
  }

  async function saveEdit() {
    if (!editingRow) return
    const pilihan = Object.entries(editJumlah)
      .filter(([, jumlah]) => jumlah > 0)
      .map(([tendaJenisId, jumlah]) => ({ tendaJenisId, jumlah }))
    if (pilihan.length === 0) {
      toast.error('Pilih minimal satu jenis tenda')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/sekolah/${editingRow.id}/tenda`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilihan }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal memperbarui sewa tenda')
      toast.success('Data sewa tenda dan kwitansi berhasil diperbarui')
      setEditingRow(null)
      await fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <p className="font-body text-sm text-event-navy/50 text-center py-8">Memuat data...</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-xs text-event-navy">SEKOLAH YANG SEWA TENDA (SUDAH LUNAS)</h2>

      {data.length === 0 ? (
        <div className="border-3 border-event-navy bg-white py-10 text-center">
          <p className="font-body text-sm text-event-navy/50">Belum ada sekolah yang sewa tenda</p>
        </div>
      ) : (
        <div className="border-3 border-event-navy overflow-x-auto bg-white">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-event-navy text-white">
                <th className="font-body text-xs px-3 py-3 text-left">Nama Sekolah</th>
                <th className="font-body text-xs px-3 py-3 text-left">Detail Tenda</th>
                <th className="font-body text-xs px-3 py-3 text-center">Total Unit</th>
                <th className="font-body text-xs px-3 py-3 text-right">Total Biaya</th>
                <th className="font-body text-xs px-3 py-3 text-left">Tgl Konfirmasi</th>
                <th className="font-body text-xs px-3 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s, i) => (
                <tr key={s.id} className={`border-t-2 border-event-navy/10 ${i % 2 === 1 ? 'bg-event-cream/40' : ''}`}>
                  <td className="px-3 py-2.5 font-body text-sm font-bold text-event-navy">
                    {s.namaSekolah}
                    <span className="block font-body text-[10px] text-event-navy/50 font-normal">{s.kodePendaftaran ?? 'Tanpa nomor pendaftaran'}</span>
                  </td>
                  <td className="px-3 py-2.5 font-body text-xs text-event-navy">
                    {s.tenda.map((t) => `${t.nama} (${t.jumlah})`).join(', ')}
                  </td>
                  <td className="px-3 py-2.5 text-center font-body text-xs text-event-navy">{s.totalUnit}</td>
                  <td className="px-3 py-2.5 text-right font-body text-xs font-bold text-event-navy">{rp(s.totalBiaya)}</td>
                  <td className="px-3 py-2.5 font-body text-xs text-event-navy">
                    {s.tanggalSewa
                      ? new Date(s.tanggalSewa).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        title="Ubah sewa tenda"
                        aria-label={`Ubah sewa tenda ${s.namaSekolah}`}
                        onClick={() => void openEdit(s)}
                        disabled={deletingId !== null || isSaving}
                        className="inline-flex h-8 w-8 items-center justify-center border-2 border-event-navy text-event-navy hover:bg-event-yellow disabled:opacity-50"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        title="Hapus sewa tenda"
                        aria-label={`Hapus sewa tenda ${s.namaSekolah}`}
                        onClick={() => void deleteSewa(s)}
                        disabled={deletingId !== null || isSaving}
                        className="inline-flex h-8 w-8 items-center justify-center border-2 border-pmi-red text-pmi-red hover:bg-pmi-red hover:text-white disabled:opacity-50"
                      >
                        {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        isOpen={editingRow !== null}
        onClose={() => { if (!isSaving) setEditingRow(null) }}
        title={editingRow ? `UBAH TENDA - ${editingRow.namaSekolah}` : 'UBAH SEWA TENDA'}
      >
        <div className="flex flex-col gap-4">
          <p className="font-body text-xs text-event-navy/60">
            Perubahan akan memperbarui jumlah sewa, total pembayaran, stok, dan kwitansi.
          </p>
          <div className="flex flex-col gap-2">
            {tendaOptions.map((tenda) => (
              <label key={tenda.id} className="flex items-center justify-between gap-3 border-2 border-event-navy/15 px-3 py-2">
                <span className="min-w-0 font-body text-xs text-event-navy">
                  <span className="block font-bold">{tenda.nama}</span>
                  <span className="text-[10px] text-event-navy/55">Rp{tenda.harga.toLocaleString('id-ID')} · stok tersedia {tenda.stokTersisa}</span>
                </span>
                <input
                  type="number"
                  min="0"
                  max={tenda.stokTersisa + (editingRow?.tenda.find((item) => item.tendaJenisId === tenda.id)?.jumlah ?? 0)}
                  value={editJumlah[tenda.id] ?? 0}
                  onChange={(event) => setEditJumlah((current) => ({ ...current, [tenda.id]: Math.max(0, Number(event.target.value) || 0) }))}
                  className="h-9 w-20 border-2 border-event-navy px-2 text-center font-body text-sm"
                  aria-label={`Jumlah ${tenda.nama}`}
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditingRow(null)} disabled={isSaving}>Batal</Button>
            <Button type="button" onClick={() => void saveEdit()} isLoading={isSaving}>Simpan Perubahan</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
