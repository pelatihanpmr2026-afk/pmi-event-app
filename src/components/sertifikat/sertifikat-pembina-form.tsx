'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, FileDown, Loader2, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { toast } from 'sonner'

interface HasilItem {
  id: string
  no: number
  namaPembina: string
  namaSekolah: string
  kategori: string
}

export function SertifikatPembinaForm() {
  const [query, setQuery] = useState('')
  const [saran, setSaran] = useState<HasilItem[]>([])
  const [tabel, setTabel] = useState<HasilItem[]>([])
  const [mengetik, setMengetik] = useState(false)
  const [dropdownTerbuka, setDropdownTerbuka] = useState(false)
  const [mencari, setMencari] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)

  function withNo(rows: Omit<HasilItem, 'no'>[]): HasilItem[] {
    return rows.map((r, i) => ({ ...r, no: i + 1 }))
  }

  async function fetchSaran(q: string, seq: number) {
    try {
      const res = await fetch(`/api/sertifikat-pembina/cari?q=${encodeURIComponent(q)}`)
      const result = await res.json()
      if (seq !== seqRef.current) return // abaikan respons basi
      if (res.ok) {
        setSaran(withNo(result.data))
        setDropdownTerbuka(true)
      }
    } catch {
      // diam — dropdown hanya saran, error tampil saat tombol Cari ditekan
    } finally {
      if (seq === seqRef.current) setMengetik(false)
    }
  }

  function handleUbah(value: string) {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.trim().length < 2) {
      setSaran([])
      setDropdownTerbuka(false)
      setMengetik(false)
      return
    }
    // Selama pengguna masih mengetik → nama pembina di-blur (privasi)
    setMengetik(true)
    const seq = ++seqRef.current
    timerRef.current = setTimeout(() => void fetchSaran(value.trim(), seq), 400)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function handleCari() {
    if (query.trim().length < 2) {
      toast.error('Masukkan minimal 2 karakter untuk mencari')
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    setMengetik(false)
    setDropdownTerbuka(false)
    setMencari(true)
    try {
      const res = await fetch(`/api/sertifikat-pembina/cari?q=${encodeURIComponent(query.trim())}`)
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal mencari')
      setTabel(withNo(result.data))
      if (result.data.length === 0) toast.info('Sertifikat tidak ditemukan. Coba kata kunci lain.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setMencari(false)
    }
  }

  function pilihSaran(item: HasilItem) {
    setTabel([{ ...item, no: 1 }])
    setDropdownTerbuka(false)
    setQuery(item.namaSekolah)
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

  const columns: ResponsiveTableColumn<HasilItem>[] = [
    {
      key: 'no',
      header: 'No',
      align: 'center',
      width: '60px',
      render: (r) => <span className="text-gray-500">{r.no}</span>,
    },
    {
      key: 'namaPembina',
      header: 'Nama Pembina',
      render: (r) => <span className="font-medium">{r.namaPembina}</span>,
    },
    {
      key: 'namaSekolah',
      header: 'Nama Sekolah',
      render: (r) => <span>{r.namaSekolah}</span>,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      render: (r) => (
        <button
          onClick={() => void handleUnduh(r)}
          disabled={downloadingId === r.id}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-btn)] bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {downloadingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          Unduh
        </button>
      ),
    },
  ]

  const renderMobileCard = (row: HasilItem) => (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-3">
      <div>
        <p className="font-body font-semibold text-sm text-event-navy">{row.namaPembina}</p>
        <p className="font-body text-[11px] text-gray-500 mt-0.5">
          {row.namaSekolah} <span className="text-gray-400">({row.kategori})</span>
        </p>
      </div>
      <button
        onClick={() => void handleUnduh(row)}
        disabled={downloadingId === row.id}
        className="flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-btn)] bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {downloadingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        Unduh Sertifikat
      </button>
    </div>
  )

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="relative">
        <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-5 flex flex-col gap-3">
          <label className="font-body text-xs font-medium text-gray-600">
            Cari berdasarkan nama pembina atau nama sekolah
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="cth. Budi atau SMAN 1 Cianjur"
                value={query}
                onChange={(e) => handleUbah(e.target.value)}
                onFocus={() => {
                  if (saran.length > 0) setDropdownTerbuka(true)
                }}
                onBlur={() => setTimeout(() => setDropdownTerbuka(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCari()
                  if (e.key === 'Escape') setDropdownTerbuka(false)
                }}
              />
            </div>
            <button
              onClick={() => void handleCari()}
              disabled={mencari}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-event-blue text-white text-sm font-medium hover:bg-event-navy transition-colors disabled:opacity-50"
            >
              {mencari ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Cari
            </button>
          </div>
          <p className="font-body text-[11px] text-gray-400 flex items-center gap-1">
            <EyeOff size={12} />
            Nama pembina disamarkan selama mengetik untuk menjaga privasi.
          </p>
        </div>

        {dropdownTerbuka && saran.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-y-auto border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-lg bg-white">
            {saran.slice(0, 8).map((item) => (
              <button
                key={item.id}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pilihSaran(item)
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex flex-col gap-0.5"
              >
                <span
                  className={`font-body font-semibold text-sm text-event-navy transition-all ${
                    mengetik ? 'blur-[4px] select-none' : ''
                  }`}
                >
                  {item.namaPembina}
                </span>
                <span className="font-body text-[11px] text-gray-500">
                  {item.namaSekolah} <span className="text-gray-400">({item.kategori})</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ResponsiveTable
        columns={columns}
        data={tabel}
        emptyMessage="Belum ada hasil — gunakan pencarian di atas untuk menemukan sertifikat."
        renderMobileCard={renderMobileCard}
      />
    </div>
  )
}
