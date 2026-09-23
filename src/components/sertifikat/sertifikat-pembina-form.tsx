'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, FileDown, Loader2, Pencil, X, School } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { toast } from 'sonner'
import { cariSekolah, type SekolahCari } from '@/lib/cari-sekolah'

interface BarisPembina {
  id: string
  no: number
  namaPembina: string
  namaSekolah: string
  kategori: string
}

type FilterKategori = 'SEMUA' | 'WIRA' | 'MADYA'

export function SertifikatPembinaForm() {
  const [semuaSekolah, setSemuaSekolah] = useState<SekolahCari[]>([])
  const [memuatDaftar, setMemuatDaftar] = useState(true)
  const [query, setQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState<FilterKategori>('SEMUA')
  const [sekolahTerpilih, setSekolahTerpilih] = useState<{ id: string; namaSekolah: string; kategori: string } | null>(null)
  const [tabel, setTabel] = useState<BarisPembina[]>([])
  const [memuatTabel, setMemuatTabel] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Modal edit
  const [editItem, setEditItem] = useState<BarisPembina | null>(null)
  const [editNama, setEditNama] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  // Muat SELURUH daftar sekolah sekali — pencarian jalan instan di memori
  useEffect(() => {
    let aktif = true
    fetch('/api/sertifikat-pembina/sekolah')
      .then((res) => res.json())
      .then((result) => {
        if (aktif && result.success) setSemuaSekolah(result.data)
        else if (aktif) toast.error('Gagal memuat daftar sekolah')
      })
      .catch(() => {
        if (aktif) toast.error('Gagal memuat daftar sekolah')
      })
      .finally(() => {
        if (aktif) setMemuatDaftar(false)
      })
    return () => {
      aktif = false
    }
  }, [])

  // Filter instan: kategori + fuzzy query, ranking relevansi
  const daftarTampil = useMemo(() => {
    const perKategori =
      filterKategori === 'SEMUA' ? semuaSekolah : semuaSekolah.filter((s) => s.kategori === filterKategori)
    return cariSekolah(query, perKategori)
  }, [query, filterKategori, semuaSekolah])

  async function muatPembina(sekolahId: string, namaSekolah: string, kategori: string) {
    setMemuatTabel(true)
    try {
      const res = await fetch(`/api/sertifikat-pembina/sekolah/${sekolahId}/pembina`)
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal memuat data')
      setSekolahTerpilih({ id: sekolahId, namaSekolah, kategori })
      setTabel(
        result.data.pembina.map((p: { id: string; namaPembina: string }, i: number) => ({
          id: p.id,
          no: i + 1,
          namaPembina: p.namaPembina,
          namaSekolah: result.data.namaSekolah,
          kategori: result.data.kategori,
        }))
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setMemuatTabel(false)
    }
  }

  function pilihSekolah(s: SekolahCari) {
    void muatPembina(s.id, s.namaSekolah, s.kategori)
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
  }

  async function simpanEdit() {
    if (!editItem) return
    if (editNama.trim().length < 3) {
      toast.error('Nama baru minimal 3 karakter')
      return
    }
    setMenyimpan(true)
    try {
      const res = await fetch(`/api/sertifikat-pembina/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaBaru: editNama.trim() }),
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
      <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-5 flex flex-col gap-3">
        <label className="font-body text-xs font-medium text-gray-600">
          Langkah 1 — Temukan sekolah Anda
        </label>
        <Input
          placeholder="Ketik nama sekolah… cth. smpn 1 cianjur"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          {(['SEMUA', 'WIRA', 'MADYA'] as FilterKategori[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilterKategori(k)}
              className={`px-3.5 py-1.5 rounded-full font-body text-xs font-medium transition-colors ${
                filterKategori === k
                  ? 'bg-event-blue text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {k === 'SEMUA' ? 'Semua' : k}
            </button>
          ))}
          <span className="ml-auto font-body text-[11px] text-gray-400">
            {memuatDaftar ? 'Memuat…' : `${daftarTampil.length} sekolah`}
          </span>
        </div>
        <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-[var(--radius-card)] divide-y divide-gray-100">
          {memuatDaftar ? (
            <p className="font-body text-xs text-gray-400 text-center py-8">Memuat daftar sekolah…</p>
          ) : daftarTampil.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <Search size={24} className="text-gray-300" />
              <p className="font-body text-xs text-gray-400 text-center px-4">
                Tidak ditemukan. Coba kata kunci lain atau periksa ejaan
                (mis. &ldquo;cianjur&rdquo; bukan &ldquo;cipanjur&rdquo;).
              </p>
            </div>
          ) : (
            daftarTampil.map((s) => (
              <button
                key={s.id}
                onClick={() => pilihSekolah(s)}
                className={`w-full text-left px-4 py-2.5 hover:bg-blue-50/60 flex items-center gap-2.5 transition-colors ${
                  sekolahTerpilih?.id === s.id ? 'bg-blue-50/60' : ''
                }`}
              >
                <School size={16} className="text-gray-300 shrink-0" />
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-body font-semibold text-sm text-event-navy truncate">{s.namaSekolah}</span>
                  <span className="font-body text-[11px] text-gray-500">
                    {s.kategori} · {s.jumlahPembina} pembina
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
        <p className="font-body text-[11px] text-gray-400">
          Daftar hanya menampilkan nama sekolah. Daftar pembina muncul setelah Anda memilih sekolah.
          Salah ketik 1–2 huruf masih ditoleransi.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-body text-xs font-medium text-gray-600">
          Langkah 2 — Unduh sertifikat
          {sekolahTerpilih && (
            <>
              {' untuk '}
              <span className="font-semibold text-event-navy">{sekolahTerpilih.namaSekolah}</span>
            </>
          )}
        </p>
        {memuatTabel ? (
          <p className="font-body text-sm text-gray-400 text-center py-8">Memuat data pembina…</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={tabel}
            emptyMessage={
              sekolahTerpilih
                ? 'Sekolah ini belum memiliki data pembina.'
                : 'Pilih sekolah Anda pada daftar di atas.'
            }
            renderMobileCard={renderMobileCard}
          />
        )}
      </div>

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
