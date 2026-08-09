'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { FileText, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { STATUS_PEMBAYARAN_CONFIG } from '@/lib/constants-sekolah'

interface PembayaranData {
  id: string
  tipe: 'PESERTA' | 'TENDA'
  statusPembayaran: 'BELUM_BAYAR' | 'MENUNGGU_KONFIRMASI' | 'LUNAS' | 'DITOLAK'
  jumlahBiaya: number
  buktiTransferUrl: string | null
  catatanAdmin: string | null
  kwitansiUrl: string | null
}

export function KonfirmasiPembayaranPanel({
  pembayaran,
  onUpdated,
}: {
  pembayaran: PembayaranData | null
  onUpdated: () => void
}) {
  const [showTolakForm, setShowTolakForm] = useState(false)
  const [alasanTolak, setAlasanTolak] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!pembayaran) {
    return (
      <div className="border-2 border-dashed border-event-navy/30 p-4 text-center">
        <p className="font-body text-xs text-event-navy/50">
          Belum ada tagihan {pembayaran === null ? '' : ''} untuk ini
        </p>
      </div>
    )
  }

  const statusConfig = STATUS_PEMBAYARAN_CONFIG[pembayaran.statusPembayaran]

  async function handleKonfirmasi(aksi: 'LUNAS' | 'DITOLAK') {
    if (aksi === 'DITOLAK' && alasanTolak.trim().length < 5) {
      toast.error('Alasan penolakan minimal 5 karakter')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/pembayaran/${pembayaran!.id}/konfirmasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aksi,
          catatanAdmin: aksi === 'DITOLAK' ? alasanTolak.trim() : undefined,
        }),
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result?.message || 'Gagal memproses konfirmasi')

      toast.success(aksi === 'LUNAS' ? 'Pembayaran dikonfirmasi lunas' : 'Pembayaran ditolak')
      setShowTolakForm(false)
      setAlasanTolak('')
      onUpdated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isPdf = pembayaran.buktiTransferUrl?.toLowerCase().endsWith('.pdf')

  return (
    <div className="border-2 border-event-navy/20 p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-body font-bold text-xs text-event-navy">
          {pembayaran.tipe === 'PESERTA' ? 'Pembayaran Peserta & Pendamping' : 'Pembayaran Tenda'}
        </span>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>

      <p className="font-body text-sm font-bold text-event-navy">
        Rp{pembayaran.jumlahBiaya.toLocaleString('id-ID')}
      </p>

      {pembayaran.buktiTransferUrl && (
        
        <a  href={pembayaran.buktiTransferUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
{isPdf ? (
  <div className="flex items-center gap-2 border-2 border-event-navy px-3 py-2 hover:bg-event-cream transition-colors">
    <FileText size={16} className="text-event-navy" />
    <span className="font-body text-xs text-event-navy">Lihat Bukti Transfer (PDF)</span>
  </div>
) : (
  <div className="relative w-full h-40 border-2 border-event-navy overflow-hidden">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={pembayaran.buktiTransferUrl}
      alt="Bukti transfer"
      className="w-full h-full object-contain"
    />
  </div>
)}
        </a>
      )}

      {pembayaran.statusPembayaran === 'DITOLAK' && pembayaran.catatanAdmin && (
        <div className="bg-pmi-red/10 border-2 border-pmi-red p-2">
          <p className="font-body text-[11px] text-event-navy">
            <span className="font-bold">Alasan ditolak:</span> {pembayaran.catatanAdmin}
          </p>
        </div>
      )}

      {pembayaran.statusPembayaran === 'MENUNGGU_KONFIRMASI' && !showTolakForm && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleKonfirmasi('LUNAS')}
            isLoading={isSubmitting}
            className="flex-1 flex items-center justify-center gap-1.5"
          >
            <Check size={14} />
            Konfirmasi Lunas
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setShowTolakForm(true)}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-1.5"
          >
            <X size={14} />
            Tolak
          </Button>
        </div>
      )}

      {showTolakForm && (
        <div className="flex flex-col gap-2">
          <textarea
            value={alasanTolak}
            onChange={(e) => setAlasanTolak(e.target.value)}
            placeholder="Alasan penolakan (misal: nominal tidak sesuai, foto bukti buram, dll)"
            rows={3}
            className="font-body text-xs px-3 py-2 border-2 border-event-navy resize-none focus:outline-none"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => handleKonfirmasi('DITOLAK')}
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

     {pembayaran.kwitansiUrl && (
  <a href={pembayaran.kwitansiUrl} download target="_blank" rel="noopener noreferrer">
    <Button type="button" variant="secondary" size="sm" className="w-full">
      Download Kwitansi (PDF)
    </Button>
  </a>
)}
    </div>
  )
}