'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface SewaRow {
  id: string
  namaSekolah: string
  kodePendaftaran: string | null
  tenda: { nama: string; jumlah: number }[]
  totalUnit: number
  totalBiaya: number
  tanggalSewa: string | null
}

function rp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function TendaSewaList() {
  const [data, setData] = useState<SewaRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
                    <button
                      type="button"
                      title="Hapus sewa tenda"
                      aria-label={`Hapus sewa tenda ${s.namaSekolah}`}
                      onClick={() => void deleteSewa(s)}
                      disabled={deletingId !== null}
                      className="inline-flex h-8 w-8 items-center justify-center border-2 border-pmi-red text-pmi-red hover:bg-pmi-red hover:text-white disabled:opacity-50"
                    >
                      {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
