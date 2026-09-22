'use client'

import { useState } from 'react'
import { Search, FileDown, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface HasilItem {
  id: string
  namaPembina: string
  namaSekolah: string
  kategori: string
}

export function SertifikatPembinaForm() {
  const [nama, setNama] = useState('')
  const [sekolah, setSekolah] = useState('')
  const [hasil, setHasil] = useState<HasilItem[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function handleCari(e?: React.FormEvent) {
    e?.preventDefault()
    if (nama.trim().length < 3 && sekolah.trim().length < 3) {
      toast.error('Masukkan minimal 3 karakter nama pembina atau nama sekolah')
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (nama.trim()) params.set('nama', nama.trim())
      if (sekolah.trim()) params.set('sekolah', sekolah.trim())
      const res = await fetch(`/api/sertifikat-pembina/cari?${params}`)
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal mencari')
      setHasil(result.data)
      setSearched(true)
      if (result.data.length === 0) toast.info('Sertifikat tidak ditemukan. Periksa kembali ejaan nama.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnduh(item: HasilItem) {
    setDownloadingId(item.id)
    try {
      const res = await fetch(`/api/sertifikat-pembina/${item.id}/unduh`)
      if (!res.ok) {
        const result = await res.json().catch(() => null)
        throw new Error(result?.message || 'Gagal mengunduh')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Sertifikat_${item.namaPembina.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Sertifikat berhasil diunduh')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-4">
      <form
        onSubmit={(e) => void handleCari(e)}
        className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-5 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-xs font-medium text-gray-600">Nama Pembina</label>
          <Input placeholder="cth. Budi Santoso" value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-body text-xs font-medium text-gray-600">Nama Sekolah</label>
          <Input placeholder="cth. SMAN 1 Cianjur" value={sekolah} onChange={(e) => setSekolah(e.target.value)} />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-btn)] bg-event-blue text-white text-sm font-medium hover:bg-event-navy transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Cari Sertifikat
        </button>
      </form>

      {searched && (
        <div className="flex flex-col gap-3">
          {hasil.length === 0 ? (
            <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] bg-white py-10 text-center">
              <Search size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="font-body text-sm text-gray-400">Tidak ditemukan. Coba kata kunci lain.</p>
            </div>
          ) : (
            hasil.map((item) => (
              <div
                key={item.id}
                className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold text-sm text-event-navy truncate">{item.namaPembina}</p>
                  <p className="font-body text-[11px] text-gray-500 truncate">
                    {item.namaSekolah} <span className="text-gray-400">({item.kategori})</span>
                  </p>
                </div>
                <button
                  onClick={() => void handleUnduh(item)}
                  disabled={downloadingId === item.id}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-btn)] bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {downloadingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  Unduh
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
