'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Edit2, FileText, Loader2, X, Check, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { toast } from 'sonner'

interface PembinaItem {
  id: string
  no: number
  namaPembina: string
  namaSekolah: string
  kategori: string
  sekolahId: string
}

interface SekolahOption {
  id: string
  namaLengkap: string
  kategori: string
}

export function PembinaTable() {
  const [data, setData] = useState<PembinaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const firstRun = useRef(true)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Add pembina modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [sekolahList, setSekolahList] = useState<SekolahOption[]>([])
  const [selectedSekolahId, setSelectedSekolahId] = useState('')
  const [newNamaPembina, setNewNamaPembina] = useState('')
  const [adding, setAdding] = useState(false)
  const [sekolahSearch, setSekolahSearch] = useState('')

  async function fetchData(q: string, p: number) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '50' })
      if (q) params.set('search', q)
      const res = await fetch(`/api/pembina/list?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setTotalPages(result.pagination.totalPages)
        setTotal(result.pagination.total)
      }
    } finally {
      setLoading(false)
    }
  }

  async function fetchSekolahList() {
    try {
      const PAGE = 100
      let current = 1
      let allData: SekolahOption[] = []
      while (true) {
        const params = new URLSearchParams({ page: String(current), pageSize: String(PAGE) })
        const res = await fetch(`/api/sekolah/list?${params}`)
        const result = await res.json()
        if (result.success) {
          allData = allData.concat(result.data.map((s: SekolahOption) => ({ id: s.id, namaLengkap: s.namaLengkap, kategori: s.kategori })))
          if (current >= result.pagination.totalPages) break
          current++
        } else {
          break
        }
      }
      setSekolahList(allData)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      void fetchData('', 1)
      void fetchSekolahList()
    }
  }, [])

  function handleSearch(value: string) {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      void fetchData(value, 1)
    }, 400)
  }

  function startEdit(item: PembinaItem) {
    setEditingId(item.id)
    setEditValue(item.namaPembina)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function saveEdit(id: string) {
    if (!editValue.trim() || editValue.trim().length < 2) {
      toast.error('Nama pembina minimal 2 karakter')
      return
    }
    setSavingId(id)
    try {
      const res = await fetch(`/api/pembina/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: editValue.trim() }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan')
      toast.success('Nama pembina berhasil diperbarui')
      setEditingId(null)
      setEditValue('')
      void fetchData(search, page)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string, nama: string) {
    if (!window.confirm(`Hapus pembina "${nama}"?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/pembina/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menghapus')
      toast.success('Pembina berhasil dihapus')
      void fetchData(search, page)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setDeletingId(null)
    }
  }

  function handleGenerate(id: string) {
    setGeneratingId(id)
    window.open(`/api/pembina/${id}/sertifikat`, '_blank')
    setTimeout(() => setGeneratingId(null), 2000)
  }

  async function handleAdd() {
    if (!selectedSekolahId) {
      toast.error('Pilih sekolah terlebih dahulu')
      return
    }
    if (!newNamaPembina.trim() || newNamaPembina.trim().length < 2) {
      toast.error('Nama pembina minimal 2 karakter')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/pembina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sekolahId: selectedSekolahId, nama: newNamaPembina.trim() }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menambahkan')
      toast.success('Pembina berhasil ditambahkan')
      setShowAddModal(false)
      setSelectedSekolahId('')
      setNewNamaPembina('')
      setSekolahSearch('')
      void fetchData(search, page)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setAdding(false)
    }
  }

  const filteredSekolah = sekolahList.filter(
    (s) => s.namaLengkap.toLowerCase().includes(sekolahSearch.toLowerCase())
  )

  const columns: ResponsiveTableColumn<PembinaItem>[] = [
    {
      key: 'no',
      header: 'No',
      align: 'center',
      width: '60px',
      render: (p) => <span className="text-gray-500">{p.no}</span>,
    },
    {
      key: 'namaPembina',
      header: 'Nama Pembina',
      render: (p) => {
        if (editingId === p.id) {
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveEdit(p.id)
                  if (e.key === 'Escape') cancelEdit()
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <button onClick={() => void saveEdit(p.id)} disabled={savingId === p.id} className="text-green-600 hover:text-green-800 disabled:opacity-50">
                {savingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{p.namaPembina}</span>
            <button onClick={() => startEdit(p)} className="text-gray-400 hover:text-event-blue" title="Edit nama pembina">
              <Edit2 size={14} />
            </button>
          </div>
        )
      },
    },
    {
      key: 'namaSekolah',
      header: 'Nama Sekolah',
      render: (p) => (
        <div className="flex flex-col">
          <span>{p.namaSekolah}</span>
          <span className="text-[10px] text-gray-400">{p.kategori}</span>
        </div>
      ),
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      hideOnMobile: true,
      render: (p) => (
        <div className="flex items-center gap-1.5 justify-center">
          <button
            onClick={() => handleGenerate(p.id)}
            disabled={generatingId === p.id}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-[var(--radius-btn)] bg-event-blue text-white text-xs font-medium hover:bg-event-navy transition-colors disabled:opacity-50"
            title="Download Sertifikat"
          >
            {generatingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            Sertifikat
          </button>
          <button
            onClick={() => void handleDelete(p.id, p.namaPembina)}
            disabled={deletingId === p.id}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-[var(--radius-btn)] bg-red-500 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            title="Hapus Pembina"
          >
            {deletingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      ),
    },
  ]

  const renderMobileCard = (row: PembinaItem) => (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-body text-[10px] text-gray-400">No. {row.no}</p>
          {editingId === row.id ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveEdit(row.id)
                  if (e.key === 'Escape') cancelEdit()
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <button onClick={() => void saveEdit(row.id)} disabled={savingId === row.id} className="text-green-600">
                {savingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button onClick={cancelEdit} className="text-gray-400"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-body font-semibold text-sm text-event-navy">{row.namaPembina}</p>
              <button onClick={() => startEdit(row)} className="text-gray-400 hover:text-event-blue"><Edit2 size={12} /></button>
            </div>
          )}
          <p className="font-body text-[11px] text-gray-500 mt-0.5">{row.namaSekolah} <span className="text-[9px] text-gray-400">({row.kategori})</span></p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleGenerate(row.id)}
          disabled={generatingId === row.id}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-btn)] bg-event-blue text-white text-xs font-medium hover:bg-event-navy transition-colors disabled:opacity-50"
        >
          {generatingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          Sertifikat
        </button>
        <button
          onClick={() => void handleDelete(row.id, row.namaPembina)}
          disabled={deletingId === row.id}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--radius-btn)] bg-red-500 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {deletingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Cari nama sekolah..." value={search} onChange={(e) => handleSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-event-blue text-white text-sm font-medium hover:bg-event-navy transition-colors"
        >
          <Plus size={16} />
          Tambah Pembina
        </button>
      </div>

      <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white overflow-hidden">
        {loading ? (
          <p className="font-body text-sm text-gray-400 text-center py-8">Memuat data...</p>
        ) : data.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Search size={24} className="text-gray-300" />
            <p className="font-body text-sm text-gray-400">Tidak ada data pembina</p>
          </div>
        ) : (
          <>
            <ResponsiveTable columns={columns} data={data} renderMobileCard={renderMobileCard} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="font-body text-xs text-gray-400">
                  Halaman {page} dari {totalPages} ({total} data)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => { const p = page - 1; setPage(p); void fetchData(search, p) }}
                    className="px-3 py-1 text-xs border rounded disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => { const p = page + 1; setPage(p); void fetchData(search, p) }}
                    className="px-3 py-1 text-xs border rounded disabled:opacity-50"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Pembina Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold text-event-navy">Tambah Pembina</h2>
              <button onClick={() => { setShowAddModal(false); setSelectedSekolahId(''); setNewNamaPembina(''); setSekolahSearch('') }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-medium text-gray-600">Cari Sekolah</label>
              <Input
                placeholder="Ketik nama sekolah..."
                value={sekolahSearch}
                onChange={(e) => { setSekolahSearch(e.target.value); setSelectedSekolahId('') }}
              />
              {sekolahSearch && !selectedSekolahId && (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                  {filteredSekolah.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3 text-center">Tidak ditemukan</p>
                  ) : (
                    filteredSekolah.slice(0, 20).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedSekolahId(s.id); setSekolahSearch(s.namaLengkap) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        {s.namaLengkap} <span className="text-[10px] text-gray-400">({s.kategori})</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedSekolahId && (
                <p className="text-xs text-green-600">Sekolah dipilih</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-body text-xs font-medium text-gray-600">Nama Pembina</label>
              <Input
                placeholder="Masukkan nama pembina"
                value={newNamaPembina}
                onChange={(e) => setNewNamaPembina(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd() }}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAddModal(false); setSelectedSekolahId(''); setNewNamaPembina(''); setSekolahSearch('') }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => void handleAdd()}
                disabled={adding || !selectedSekolahId || !newNamaPembina.trim()}
                className="px-4 py-2 text-sm bg-event-blue text-white rounded-md hover:bg-event-navy disabled:opacity-50"
              >
                {adding ? <Loader2 size={14} className="animate-spin inline" /> : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
