'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Eye, Check, Loader2, MoreVertical, ExternalLink, FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'
import { KATEGORI_SEKOLAH_OPTIONS, STATUS_PEMBAYARAN_CONFIG } from '@/lib/constants-sekolah'
import { SekolahDetailModal } from './sekolah-detail-modal'
import { isReadOnlySekolah, isKtaRole, type AdminRoleType } from '@/lib/admin-role'

interface SekolahListItem {
  id: string
  nomorPendaftaran: number
  namaLengkap: string
  kodePendaftaran: string
  jenjang: string
  kategori: string
  namaPembina: string
  jumlahPeserta: number
  jumlahPendamping: number
  jumlahTenda: number
  sudahCetak: boolean
  pembayaranPeserta: { id: string; status: string; jumlahBiaya: number; statusDaftarUlang: boolean; buktiTransferUrl: string | null; kwitansiUrl: string | null } | null
  pembayaranTenda: { id: string; status: string; jumlahBiaya: number; buktiTransferUrl: string | null; kwitansiUrl: string | null } | null
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="font-body text-xs text-gray-300">-</span>
  const config = STATUS_PEMBAYARAN_CONFIG[status as keyof typeof STATUS_PEMBAYARAN_CONFIG]
  // Paksa tipe varian menjadi tipe yang valid untuk Badge
  const variant = config.variant as 'success' | 'warning' | 'info' | 'danger'
  return <Badge variant={variant}>{config.label}</Badge>
}

function DaftarUlangBadge({ pembayaran }: { pembayaran: SekolahListItem['pembayaranPeserta'] }) {
  if (pembayaran?.status !== 'LUNAS') return <span className="font-body text-xs text-gray-300">-</span>
  return <Badge variant={pembayaran.statusDaftarUlang ? 'success' : 'warning'}>{pembayaran.statusDaftarUlang ? 'Sudah' : 'Belum'}</Badge>
}

export function SekolahTable({
  initialData,
  initialTotal,
  role,
}: {
  initialData: SekolahListItem[]
  initialTotal: number
  role: AdminRoleType
}) {
  const PAGE_SIZE = 20
  const [data, setData] = useState(initialData)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null)
  const [markingPrintedId, setMarkingPrintedId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const firstRun = useRef(true)
  const readOnly = isReadOnlySekolah(role)
  const isKTA = isKtaRole(role)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function fetchPage(nextPage: number, q: string, kategori: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(PAGE_SIZE),
        search: q,
        kategori,
      })
      const res = await fetch(`/api/sekolah/list?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        setTotal(result.pagination.total)
        setPage(nextPage)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    void fetchPage(page, debouncedSearch, filterKategori)
  }, [page, debouncedSearch, filterKategori])

  function openDetail(id: string) {
    setOpenMenuId(null)
    setSelectedId(id)
    setIsModalOpen(true)
  }

  async function refreshList() {
    await fetchPage(page, debouncedSearch, filterKategori)
  }

  async function confirmPayment(paymentId: string, label: string) {
    if (!window.confirm(`Konfirmasi pembayaran ${label} sebagai lunas?`)) return

    setConfirmingPaymentId(paymentId)
    try {
      const res = await fetch(`/api/pembayaran/${paymentId}/konfirmasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aksi: 'LUNAS' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal mengonfirmasi pembayaran')

      toast.success(`Pembayaran ${label} dikonfirmasi lunas`)
      await refreshList()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setConfirmingPaymentId(null)
    }
  }

function viewProof(url: string) {
    setOpenMenuId(null)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function toggleCetak(id: string, sudhCetak: boolean) {
    const aksi = sudhCetak ? 'batalkan' : 'konfirmasi'
    if (!window.confirm(`Konfirmasi data peserta sekolah ini ${aksi}kan sebagai sudah dicetak?`)) return
    setMarkingPrintedId(id)
    try {
      const res = await fetch(`/api/sekolah/${id}/cetak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sudahCetak: !sudhCetak }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal memperbarui status cetak')
      toast.success(sudhCetak ? 'Status cetak dibatalkan' : 'Data peserta ditandai sudah dicetak')
      await refreshList()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setMarkingPrintedId(null)
    }
  }

  const paginationControls = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
      <p className="font-body text-xs text-gray-400">
        Menampilkan {data.length} dari {total} total sekolah
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          <ChevronLeft size={14} /> Sebelumnya
        </Button>
        <span className="font-body text-xs text-gray-500">
          Halaman {page} dari {totalPages}
        </span>
        <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
          Berikutnya <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )

  if (isKTA) {
    const ktaColumns: ResponsiveTableColumn<SekolahListItem>[] = [
      { key: 'kode', header: 'Kode Pendaftaran', render: (s) => <span className="text-gray-500 break-all">{s.kodePendaftaran}</span> },
      {
        key: 'nama',
        header: 'Nama Sekolah',
        render: (s) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">{s.namaLengkap}</span>
            <Badge variant="default">{s.kategori}</Badge>
          </div>
        ),
      },
      {
        key: 'statusCetak',
        header: 'Status Cetak',
        align: 'center',
        render: (s) => (
          <Badge variant={s.sudahCetak ? 'success' : 'warning'}>
            {s.sudahCetak ? 'Sudah Dicetak' : 'Belum Dicetak'}
          </Badge>
        ),
      },
      {
        key: 'aksi',
        header: 'Aksi',
        align: 'center',
        render: (s) => (
          <div className="flex flex-col sm:flex-row gap-1.5 items-center justify-center">
            <a
              href={`/api/sekolah/${s.id}/export`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-btn)] bg-event-blue text-white text-xs font-medium hover:bg-event-navy transition-colors"
            >
              <FileSpreadsheet size={14} />
              Download Excel
            </a>
            <button
              type="button"
              onClick={() => void toggleCetak(s.id, s.sudahCetak)}
              disabled={markingPrintedId !== null}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-btn)] bg-event-yellow text-event-navy text-xs font-medium hover:bg-event-yellow-dark transition-colors disabled:opacity-50"
            >
              {markingPrintedId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {s.sudahCetak ? 'Batalkan Cetak' : 'Sudah Dicetak'}
            </button>
          </div>
        ),
      },
    ]

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input placeholder="Cari nama sekolah atau kode pendaftaran..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="w-full sm:w-52">
            <Select
              placeholder="Semua Kategori"
              value={filterKategori}
              onChange={(e) => {
                setFilterKategori(e.target.value)
                setPage(1)
              }}
              options={[...KATEGORI_SEKOLAH_OPTIONS]}
            />
          </div>
        </div>
        {data.length === 0 ? (
          <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white py-12 flex flex-col items-center justify-center gap-2">
            <Search size={24} className="text-gray-300" />
            <p className="font-body text-sm text-gray-400">Tidak ada data yang cocok</p>
          </div>
        ) : (
          <ResponsiveTable columns={ktaColumns} data={data} />
        )}
        {paginationControls}
      </div>
    )
  }

  if (readOnly) {
    const readonlyColumns: ResponsiveTableColumn<SekolahListItem>[] = [
      { key: 'kode', header: 'Kode Pendaftaran', render: (s) => s.kodePendaftaran },
      { key: 'nama', header: 'Nama Sekolah', render: (s) => <span className="font-semibold">{s.namaLengkap}</span> },
    ]
    return (
      <div className="flex flex-col gap-4">
        <Input placeholder="Cari nama sekolah atau kode pendaftaran..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <ResponsiveTable columns={readonlyColumns} data={data} emptyMessage="Tidak ada data yang cocok" />
        {paginationControls}
        <p className="font-body text-xs text-gray-400">Mode read-only — role Acara hanya bisa melihat daftar kode pendaftaran & nama sekolah.</p>
      </div>
    )
  }

  const columns: ResponsiveTableColumn<SekolahListItem>[] = [
    { key: 'no', header: 'No', width: '56px', align: 'center', render: (s) => s.nomorPendaftaran },
    {
      key: 'nama',
      header: 'Nama Sekolah',
      render: (s) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{s.namaLengkap}</span>
          <Badge variant="default">{s.kategori}</Badge>
        </div>
      ),
    },
    { key: 'kode', header: 'Kode Pendaftaran', render: (s) => <span className="text-gray-500">{s.kodePendaftaran}</span> },
    { key: 'peserta', header: 'Peserta', align: 'center', render: (s) => s.jumlahPeserta },
    { key: 'pendamping', header: 'Pendamping', align: 'center', render: (s) => s.jumlahPendamping },
    { key: 'bayarPeserta', header: 'Bayar Peserta', align: 'center', render: (s) => <StatusBadge status={s.pembayaranPeserta?.status} /> },
    { key: 'bayarTenda', header: 'Bayar Tenda', align: 'center', render: (s) => <StatusBadge status={s.pembayaranTenda?.status} /> },
    {
      key: 'daftarUlang',
      header: 'Daftar Ulang',
      align: 'center',
      render: (s) => <DaftarUlangBadge pembayaran={s.pembayaranPeserta} />,
    },
    {
      key: 'aksi',
      header: 'Menu',
      align: 'center',
      hideOnMobile: true,
      render: (s) => {
        const menuOpen = openMenuId === s.id
        return (
          <div className="relative inline-block text-left">
            <button type="button" aria-label={`Buka menu aksi ${s.namaLengkap}`} aria-expanded={menuOpen} onClick={() => setOpenMenuId(menuOpen ? null : s.id)} className="w-9 h-9 inline-flex items-center justify-center rounded-[var(--radius-btn)] border border-[var(--color-border)] text-gray-500 hover:text-event-navy hover:bg-[var(--color-surface-muted)] transition-colors">
              <MoreVertical size={16} />
            </button>
            {menuOpen && <div className="absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white py-1 text-left shadow-[var(--shadow-pixel-md)]">
              <button type="button" onClick={() => openDetail(s.id)} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-event-navy hover:bg-[var(--color-surface-muted)]"><Eye size={14} /> Lihat Detail Sekolah</button>
              {s.pembayaranPeserta?.status === 'MENUNGGU_KONFIRMASI' && <button type="button" onClick={() => { setOpenMenuId(null); void confirmPayment(s.pembayaranPeserta!.id, 'pendaftaran') }} disabled={confirmingPaymentId !== null} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-event-navy hover:bg-[var(--color-surface-muted)] disabled:opacity-50"><Check size={14} /> Konfirmasi Pendaftaran</button>}
              {s.pembayaranTenda?.status === 'MENUNGGU_KONFIRMASI' && <button type="button" onClick={() => { setOpenMenuId(null); void confirmPayment(s.pembayaranTenda!.id, 'sewa tenda') }} disabled={confirmingPaymentId !== null} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-event-navy hover:bg-[var(--color-surface-muted)] disabled:opacity-50"><Check size={14} /> Konfirmasi Sewa Tenda</button>}
              {s.pembayaranPeserta?.buktiTransferUrl && <button type="button" onClick={() => viewProof(s.pembayaranPeserta!.buktiTransferUrl!)} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-event-navy hover:bg-[var(--color-surface-muted)]"><ExternalLink size={14} /> Lihat Bukti Pendaftaran</button>}
{s.pembayaranTenda?.buktiTransferUrl && <button type="button" onClick={() => viewProof(s.pembayaranTenda!.buktiTransferUrl!)} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-event-navy hover:bg-[var(--color-surface-muted)]"><ExternalLink size={14} /> Lihat Bukti Sewa Tenda</button>}
              {s.pembayaranPeserta?.kwitansiUrl && <a href={s.pembayaranPeserta.kwitansiUrl} download target="_blank" rel="noopener noreferrer" onClick={() => setOpenMenuId(null)} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-event-navy hover:bg-[var(--color-surface-muted)]"><FileText size={14} /> Download Kwitansi Pendaftaran</a>}
              {s.pembayaranTenda?.kwitansiUrl && <a href={s.pembayaranTenda.kwitansiUrl} download target="_blank" rel="noopener noreferrer" onClick={() => setOpenMenuId(null)} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-event-navy hover:bg-[var(--color-surface-muted)]"><FileText size={14} /> Download Kwitansi Sewa Tenda</a>}
              <a href={`/api/sekolah/${s.id}/export`} onClick={() => setOpenMenuId(null)} className="flex w-full items-center gap-2 border-t border-[var(--color-border)] px-3 py-2 text-xs text-event-navy hover:bg-[var(--color-surface-muted)]"><FileSpreadsheet size={14} /> Download Excel Peserta & Pendamping</a>
            </div>}
          </div>
        )
      },
    },
  ]

  // Render Kartu Khusus Mobile (Dengan tombol Detail & Truncate Kode Pendaftaran)
  const renderMobileCard = (row: SekolahListItem) => (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-4 flex flex-col gap-3">
      <div>
        <p className="font-body font-semibold text-sm text-event-navy">{row.namaLengkap}</p>
        {/* FIX: Tambahkan break-all agar teks panjang terpotong dengan rapi */}
        <p className="font-body text-xs text-gray-400 break-all">{row.kodePendaftaran}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="default">{row.kategori}</Badge>
        <span className="font-body text-[11px] text-gray-500">{row.jumlahPeserta} peserta · {row.jumlahPendamping} pendamping</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-[var(--color-surface-muted)] px-2 py-1.5 rounded-[var(--radius-input)]">
          <span className="text-gray-400 block">Bayar Peserta</span>
          <StatusBadge status={row.pembayaranPeserta?.status} />
        </div>
        <div className="bg-[var(--color-surface-muted)] px-2 py-1.5 rounded-[var(--radius-input)]">
          <span className="text-gray-400 block">Bayar Tenda</span>
          <StatusBadge status={row.pembayaranTenda?.status} />
        </div>
      </div>
      <div className="bg-[var(--color-surface-muted)] px-2 py-1.5 rounded-[var(--radius-input)] text-[11px]">
        <span className="text-gray-400 block">Daftar Ulang</span>
        <DaftarUlangBadge pembayaran={row.pembayaranPeserta} />
      </div>
      <div className="grid grid-cols-1 gap-2 mt-1">
        {row.pembayaranPeserta?.status === 'MENUNGGU_KONFIRMASI' && (
          <button
            type="button"
            onClick={() => confirmPayment(row.pembayaranPeserta!.id, 'pendaftaran')}
            disabled={confirmingPaymentId !== null}
            className="flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-btn)] bg-event-blue text-white text-xs font-medium hover:bg-event-navy disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            {confirmingPaymentId === row.pembayaranPeserta.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Konfirmasi Pendaftaran
          </button>
        )}
        {row.pembayaranTenda?.status === 'MENUNGGU_KONFIRMASI' && (
          <button
            type="button"
            onClick={() => confirmPayment(row.pembayaranTenda!.id, 'sewa tenda')}
            disabled={confirmingPaymentId !== null}
            className="flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-btn)] bg-event-pink text-white text-xs font-medium hover:bg-pmi-red disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            {confirmingPaymentId === row.pembayaranTenda.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Konfirmasi Sewa Tenda
          </button>
        )}
        <button
          type="button"
          onClick={() => openDetail(row.id)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-btn)] bg-event-blue text-white text-xs font-medium hover:bg-event-blue-dark transition-colors"
        >
          <Eye size={14} />
          Lihat Detail
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Cari nama sekolah atau kode pendaftaran..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-52">
          <Select
            placeholder="Semua Kategori"
            value={filterKategori}
            onChange={(e) => {
              setFilterKategori(e.target.value)
              setPage(1)
            }}
            options={[...KATEGORI_SEKOLAH_OPTIONS]}
          />
        </div>
      </div>
      {data.length === 0 ? (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white py-12 flex flex-col items-center justify-center gap-2">
          <Search size={24} className="text-gray-300" />
          <p className="font-body text-sm text-gray-400">Tidak ada data yang cocok</p>
        </div>
      ) : (
        <ResponsiveTable columns={columns} data={data} renderMobileCard={renderMobileCard} />
      )}
      {paginationControls}
      <SekolahDetailModal
        sekolahId={selectedId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDataChanged={refreshList}
      />
    </div>
  )
}
