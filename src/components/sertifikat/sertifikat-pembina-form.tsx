'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, FileDown, Loader2, Pencil, X, School } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { toast } from 'sonner'

interface SekolahSaran {
  id: string
  namaSekolah: string
  kategori: string
  jumlahPembina: number
}

interface BarisPembina {
  id: string
  no: number
  namaPembina: string
  namaSekolah: string
  kategori: string
}

export function SertifikatPembinaForm() {
  const [query, setQuery] = useState('')
  const [saran, setSaran] = useState<SekolahSaran[]>([])
  const [dropdownTerbuka, setDropdownTerbuka] = useState(false)
  const [mencariSaran, setMencariSaran] = useState(false)
  const [sekolahTerpilih, setSekolahTerpilih] = useState<{ id: string; namaSekolah: string; kategori: string } | null>(null)
  const [tabel, setTabel] = useState<BarisPembina[]>([])
  const [memuatTabel, setMemuatTabel] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Modal edit
  const [editItem, setEditItem] = useState<BarisPembina | null>(null)
  const [editNama, setEditNama] = useState('')
  const [editWa, setEditWa] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)

  async function fetchSaran(q: string, seq: number) {
    setMencariSaran(true)
    try {
      const res = await fetch(`/api/sertifikat-pembina/cari?q=${encodeURIComponent(q)}`)
      const result = await res.json()
      if (seq !== seqRef.current) return
      if (res.ok) {
        setSaran(result.data)
        setDropdownTerbuka(true)
      }
    } catch {
      // diam — dropdown hanya saran
    } finally {
      if (seq === seqRef.current) setMencariSaran(false)
    }
  }

  function handleUbah(value: string) {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.trim().length < 2) {
      setSaran([])
      setDropdownTerbuka(false)
      setMencariSaran(false)
      return
    }
    const seq = ++seqRef.current
    timerRef.current = setTimeout(() => void fetchSaran(value.trim(), seq), 400)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function muatPembina(sekolahId: string, namaSekolah: string, kategori: string) {
    setMemuatTabel(true)
    try {
      const res = await fetch(`/api/sertifikat-pembina/sekolah/${sekolahId}/pembina`)
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal memuat data')
      setSekolahTerpilih({ id: sekolahId, namaSekolah, kategori })
      setTabel(result.data.pembina.map((p: { id: string; namaPembina: string }, i: number) => ({
        id: p.id,
        no: i + 1,
        namaPembina: p.namaPembina,
        namaSekolah: result.data.namaSekolah,
        kategori: result.data.kategori,
      })))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setMemuatTabel(false)
    }
  }

  function pilihSekolah(s: SekolahSaran) {
    setQuery(s.namaSekolah)
    setDropdownTerbuka(false)
    void muatPembina(s.id, s.namaSekolah, s.kategori)
  }

  async function handleCari() {
    if (query.trim().length < 2) {
      toast.error('Masukkan minimal 2 karakter untuk mencari')
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    setDropdownTerbuka(false)
    setMencariSaran(true)
    try {
      const res = await fetch(`/api/sertifikat-pembina/cari?q=${encodeURIComponent(query.trim())}`)
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal mencari')
      const list: SekolahSaran[] = result.data
      if (list.length === 0) {
        toast.info('Sekolah tidak ditemukan. Coba kata kunci lain.')
      } else if (list.length === 1) {
        setQuery(list[0].namaSekolah)
        await muatPembina(list[0].id, list[0].namaSekolah, list[0].kategori)
      } else {
        setSaran(list)
        setDropdownTerbuka(true)
        toast.info(`${list.length} sekolah cocok — pilih sekolah Anda dari daftar.`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setMencariSaran(false)
    }
  }

  async function handleUnduh(item: BarisPembina) {
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

  function bukaEdit(item: BarisPembina) {
    setEditItem(item)
    setEditNama(item.namaPembina)
    setEditWa('')
  }

  async function simpanEdit() {
    if (!editItem) return
    if (editNama.trim().length < 3) {
      toast.error('Nama baru minimal 3 karakter')
      return
    }
    if (editWa.replace(/\D/g, '').length < 9) {
      toast.error('Masukkan nomor WhatsApp yang valid')
      return
    }
    setMenyimpan(true)
    try {
      const res = await fetch(`/api/sertifikat-pembina/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaBaru: editNama.trim(), noWa: editWa.trim() }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan')
      toast.success(result.message)
      setEditItem(null)
      if (sekolahTerpilih) {
        await muatPembina(sekolahTerpilih.id, sekolahTerpilih.namaSekolah, sekolahTerpilih.kategori)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setMenyimpan(false)
    }
  }

  const columns: ResponsiveTableColumn<BarisPembina>[] = [
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
        <div className="flex items-center gap-1.5 justify-center">
          <button
            onClick={() => void handleUnduh(r)}
            disabled={downloadingId === r.id}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-btn)] bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {downloadingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            Unduh
          </button>
          <button
            onClick={() => bukaEdit(r)}
            title="Koreksi nama"
            className="inline-flex items-center px-2.5 py-2 rounded-[var(--radius-btn)] border border-gray-300 text-gray-500 text-xs font-medium hover:text-event-blue hover:border-event-blue transition-colors"
          >
            <Pencil size={14} />
          </button>
        </div>
      ),
    },
  ]

  const renderMobileCard = (row: BarisPembina) => (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-3">
      <div>
        <p className="font-body font-semibold text-sm text-event-navy">{row.namaPembina}</p>
        <p className="font-body text-[11px] text-gray-500 mt-0.5">
          {row.namaSekolah} <span className="text-gray-400">({row.kategori})</span>
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => void handleUnduh(row)}
          disabled={downloadingId === row.id}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-btn)] bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {downloadingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          Unduh Sertifikat
        </button>
        <button
          onClick={() => bukaEdit(row)}
          title="Koreksi nama"
          className="flex items-center justify-center px-3 py-2 rounded-[var(--radius-btn)] border border-gray-300 text-gray-500 hover:text-event-blue hover:border-event-blue transition-colors"
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="relative">
        <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-5 flex flex-col gap-3">
          <label className="font-body text-xs font-medium text-gray-600">
            Cari sekolah Anda
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="cth. SMAN 1 Cianjur"
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
              disabled={mencariSaran}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-event-blue text-white text-sm font-medium hover:bg-event-navy transition-colors disabled:opacity-50"
            >
              {mencariSaran ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Cari
            </button>
          </div>
          <p className="font-body text-[11px] text-gray-400">
            Daftar hanya menampilkan nama sekolah. Daftar pembina muncul setelah Anda memilih sekolah.
          </p>
        </div>

        {dropdownTerbuka && saran.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-y-auto border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-lg bg-white">
            {saran.slice(0, 8).map((s) => (
              <button
                key={s.id}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pilihSekolah(s)
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-2.5"
              >
                <School size={16} className="text-gray-300 shrink-0" />
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-body font-semibold text-sm text-event-navy truncate">{s.namaSekolah}</span>
                  <span className="font-body text-[11px] text-gray-500">
                    {s.kategori} · {s.jumlahPembina} pembina
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {sekolahTerpilih && (
        <p className="font-body text-xs text-gray-500 text-center -mb-1">
          Menampilkan pembina: <span className="font-semibold text-event-navy">{sekolahTerpilih.namaSekolah}</span>
        </p>
      )}

      {memuatTabel ? (
        <p className="font-body text-sm text-gray-400 text-center py-8">Memuat data...</p>
      ) : (
        <ResponsiveTable
          columns={columns}
          data={tabel}
          emptyMessage="Belum ada hasil — cari dan pilih sekolah Anda di atas."
          renderMobileCard={renderMobileCard}
        />
      )}

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold text-event-navy">Koreksi Nama Pembina</h2>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-medium text-gray-600">Nama saat ini</label>
              <Input value={editItem.namaPembina} disabled className="bg-gray-50" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-medium text-gray-600">Nama yang benar</label>
              <Input
                placeholder="cth. Budi Santoso, M.Pd."
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-medium text-gray-600">
                No. WhatsApp terdaftar sekolah
              </label>
              <Input
                placeholder="cth. 0812xxxxxxx"
                value={editWa}
                onChange={(e) => setEditWa(e.target.value)}
                inputMode="tel"
              />
              <p className="font-body text-[11px] text-gray-400">
                Untuk verifikasi: nomor yang dipakai saat pendaftaran sekolah ini.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditItem(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => void simpanEdit()}
                disabled={menyimpan}
                className="px-4 py-2 text-sm bg-event-blue text-white rounded-md hover:bg-event-navy disabled:opacity-50 inline-flex items-center gap-2"
              >
                {menyimpan && <Loader2 size={14} className="animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
