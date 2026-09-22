'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Edit2, FileText, Loader2, X, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { toast } from 'sonner'

interface PembinaItem {
  id: string
  no: number
  namaPembina: string
  namaSekolah: string
}

export function PembinaTable() {
  const [data, setData] = useState<PembinaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const firstRun = useRef(true)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      void fetchData('', 1)
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
        body: JSON.stringify({ namaPembina: editValue.trim() }),
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

  function handleGenerate(id: string) {
    setGeneratingId(id)
    window.open(`/api/pembina/${id}/sertifikat`, '_blank')
    setTimeout(() => setGeneratingId(null), 2000)
  }

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
      render: (p) => <span>{p.namaSekolah}</span>,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      hideOnMobile: true,
      render: (p) => (
        <button
          onClick={() => handleGenerate(p.id)}
          disabled={generatingId === p.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-btn)] bg-event-blue text-white text-xs font-medium hover:bg-event-navy transition-colors disabled:opacity-50"
        >
          {generatingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          Sertifikat
        </button>
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
          <p className="font-body text-[11px] text-gray-500 mt-0.5">{row.namaSekolah}</p>
        </div>
      </div>
      <button
        onClick={() => handleGenerate(row.id)}
        disabled={generatingId === row.id}
        className="flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-btn)] bg-event-blue text-white text-xs font-medium hover:bg-event-navy transition-colors disabled:opacity-50"
      >
        {generatingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        Download Sertifikat
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1">
        <Input placeholder="Cari nama sekolah..." value={search} onChange={(e) => handleSearch(e.target.value)} />
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
    </div>
  )
}
