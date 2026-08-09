'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Download, Check, X, Pencil, Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DIVISI_OPTIONS } from '@/lib/constants'

interface PengajuanDetail {
  id: string
  nomorPengajuan: string
  namaKoordinator: string
  divisi: string
  noHp: string
  totalJenisBarang: number
  totalKuantitas: number
  totalPengajuan: number
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  catatanAdmin: string | null
  pdfUrl: string | null
  tandaTanganUrl: string | null
  createdAt: string
  items: { id: string; namaBarang: string; qty: number; hargaSatuan: number; total: number }[]
}

interface EditRow {
  namaBarang: string
  qty: string
  hargaSatuan: string
}

const STATUS_CONFIG = {
  MENUNGGU: { label: 'Menunggu', variant: 'warning' as const },
  DISETUJUI: { label: 'Disetujui', variant: 'success' as const },
  DITOLAK: { label: 'Ditolak', variant: 'danger' as const },
}

function formatRp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function PengajuanDetailModal({
  pengajuanId,
  isOpen,
  onClose,
  onProcessed,
}: {
  pengajuanId: string | null
  isOpen: boolean
  onClose: () => void
  onProcessed: () => void
}) {
  const [data, setData] = useState<PengajuanDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showTolakForm, setShowTolakForm] = useState(false)
  const [alasanTolak, setAlasanTolak] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editRows, setEditRows] = useState<EditRow[]>([])

  const fetchDetail = useCallback(async () => {
    if (!pengajuanId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/pengajuan-anggaran/${pengajuanId}`)
      const result = await res.json()
      if (result.success) setData(result.data)
      else toast.error(result.message)
    } finally {
      setIsLoading(false)
    }
  }, [pengajuanId])

useEffect(() => {
    if (!isOpen || !pengajuanId) return

    const timer = setTimeout(() => {
      setShowTolakForm(false)
      setAlasanTolak('')
      setIsEditing(false)
      fetchDetail()
    }, 0)

    return () => clearTimeout(timer)
  }, [isOpen, pengajuanId, fetchDetail])

  function startEdit() {
    if (!data) return
    setEditRows(
      data.items.map((it) => ({
        namaBarang: it.namaBarang,
        qty: String(it.qty),
        hargaSatuan: String(it.hargaSatuan),
      }))
    )
    setIsEditing(true)
  }

  function updateRow(index: number, field: keyof EditRow, value: string) {
    setEditRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function addRow() {
    setEditRows((prev) => [...prev, { namaBarang: '', qty: '', hargaSatuan: '' }])
  }

  function removeRow(index: number) {
    setEditRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSaveEdit() {
    if (editRows.length === 0) {
      toast.error('Minimal 1 barang harus ada')
      return
    }

    const payload = []
    for (const row of editRows) {
      const namaBarang = row.namaBarang.trim()
      const qty = Number(row.qty)
      const hargaSatuan = Number(row.hargaSatuan)

      if (namaBarang.length < 2) {
        toast.error('Nama barang minimal 2 karakter')
        return
      }
      if (!Number.isInteger(qty) || qty < 1) {
        toast.error('Qty harus angka minimal 1')
        return
      }
      if (!Number.isInteger(hargaSatuan) || hargaSatuan < 0) {
        toast.error('Harga satuan tidak valid')
        return
      }

      payload.push({ namaBarang, qty, hargaSatuan })
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/pengajuan-anggaran/${pengajuanId}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan perubahan')

      toast.success('Perubahan tersimpan, pengajuan otomatis disetujui')
      setIsEditing(false)
      await fetchDetail()
      onProcessed()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleProses(aksi: 'DISETUJUI' | 'DITOLAK') {
    if (aksi === 'DITOLAK' && alasanTolak.trim().length < 5) {
      toast.error('Alasan penolakan minimal 5 karakter')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/pengajuan-anggaran/${pengajuanId}/proses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aksi,
          catatanAdmin: aksi === 'DITOLAK' ? alasanTolak.trim() : undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal memproses pengajuan')

      toast.success(aksi === 'DISETUJUI' ? 'Pengajuan disetujui' : 'Pengajuan ditolak')
      await fetchDetail()
      onProcessed()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const editTotal = editRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.hargaSatuan) || 0), 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="DETAIL PENGAJUAN" className="max-w-xl">
      {isLoading || !data ? (
        <p className="font-body text-sm text-event-navy/50 text-center py-8">Memuat data...</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-body font-bold text-base text-event-navy">{data.nomorPengajuan}</p>
              <p className="font-body text-xs text-event-navy/60">
                {new Date(data.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <Badge variant={STATUS_CONFIG[data.status].variant}>{STATUS_CONFIG[data.status].label}</Badge>
          </div>

          <div className="border-2 border-event-navy/20 p-3 flex flex-col gap-1.5">
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span className="text-event-navy/60">Koordinator</span>
              <span className="font-bold">{data.namaKoordinator}</span>
            </div>
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span className="text-event-navy/60">Divisi</span>
              <span className="font-bold">
                {DIVISI_OPTIONS.find((d) => d.value === data.divisi)?.label}
              </span>
            </div>
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span className="text-event-navy/60">No. HP</span>
              <span className="font-bold">{data.noHp}</span>
            </div>
          </div>

          {/* ===== RINCIAN BARANG (view / edit) ===== */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-body font-bold text-xs text-event-navy/70">Rincian Barang</p>
              {data.status === 'MENUNGGU' && !isEditing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex items-center gap-1 px-3 py-1.5 bg-event-yellow border-2 border-event-navy font-body font-bold text-[11px] text-event-navy"
                >
                  <Pencil size={11} />
                  Edit Item
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="border-2 border-event-navy/20 max-h-56 overflow-y-auto">
                {data.items.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex justify-between px-3 py-2 font-body text-xs text-event-navy ${
                      i !== data.items.length - 1 ? 'border-b-2 border-event-navy/10' : ''
                    }`}
                  >
                    <div>
                      <span className="font-bold">{item.namaBarang}</span>
                      <span className="text-event-navy/50">
                        {' '}
                        — {item.qty} × Rp{item.hargaSatuan.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <span className="font-bold">Rp{item.total.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {editRows.map((row, i) => (
                  <div key={i} className="border-2 border-event-navy/20 p-2.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-[9px] text-event-navy/50">BARANG #{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={editRows.length <= 1}
                        className="w-6 h-6 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy disabled:opacity-30"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Nama Barang"
                      value={row.namaBarang}
                      onChange={(e) => updateRow(i, 'namaBarang', e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border-2 border-event-navy/30 focus:border-event-navy focus:outline-none font-body"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={row.qty}
                        onChange={(e) => updateRow(i, 'qty', e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border-2 border-event-navy/30 focus:border-event-navy focus:outline-none font-body"
                      />
                      <input
                        type="number"
                        placeholder="Harga Satuan"
                        value={row.hargaSatuan}
                        onChange={(e) => updateRow(i, 'hargaSatuan', e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border-2 border-event-navy/30 focus:border-event-navy focus:outline-none font-body"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center justify-center gap-1.5 py-2 bg-event-blue text-white border-2 border-event-navy font-body font-bold text-xs"
                >
                  <Plus size={12} />
                  Tambah Barang
                </button>

                <div className="flex justify-between font-body font-bold text-xs text-event-navy pt-1">
                  <span>Total Sementara</span>
                  <span>{formatRp(editTotal)}</span>
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="border-3 border-event-navy bg-event-yellow/20 p-3 flex flex-col gap-1">
              <div className="flex justify-between font-body text-xs text-event-navy">
                <span>Total Jenis Barang</span>
                <span className="font-bold">{data.totalJenisBarang}</span>
              </div>
              <div className="flex justify-between font-body text-xs text-event-navy">
                <span>Total Kuantitas</span>
                <span className="font-bold">{data.totalKuantitas}</span>
              </div>
              <div className="flex justify-between font-heading text-xs text-event-navy pt-1.5 border-t-2 border-event-navy/20">
                <span>TOTAL PENGAJUAN</span>
                <span>Rp{data.totalPengajuan.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}

          {data.status === 'DITOLAK' && data.catatanAdmin && (
            <div className="border-2 border-pmi-red bg-pmi-red/10 p-3">
              <p className="font-body text-xs text-event-navy">
                <span className="font-bold">Alasan ditolak:</span> {data.catatanAdmin}
              </p>
            </div>
          )}

          {!isEditing && data.pdfUrl && (
            <a href={data.pdfUrl} download target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-1.5">
                <Download size={14} />
                Download PDF Pengajuan
              </Button>
            </a>
          )}

          {isEditing && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                isLoading={isSubmitting}
                className="flex-1"
              >
                Simpan & Setujui
              </Button>
            </div>
          )}

          {!isEditing && data.status === 'MENUNGGU' && !showTolakForm && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => handleProses('DISETUJUI')}
                isLoading={isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                Setujui
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowTolakForm(true)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                <X size={14} />
                Tolak
              </Button>
            </div>
          )}

          {!isEditing && showTolakForm && (
            <div className="flex flex-col gap-2">
              <textarea
                value={alasanTolak}
                onChange={(e) => setAlasanTolak(e.target.value)}
                placeholder="Alasan penolakan"
                rows={3}
                className="font-body text-xs px-3 py-2 border-2 border-event-navy resize-none focus:outline-none"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleProses('DITOLAK')}
                  isLoading={isSubmitting}
                  className="flex-1"
                >
                  Kirim Penolakan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTolakForm(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}