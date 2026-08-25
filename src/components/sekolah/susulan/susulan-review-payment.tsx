'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Upload, FileText, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { REKENING_INFO, ACCEPTED_BUKTI_TYPES, BIAYA_PESERTA, BIAYA_PENDAMPING } from '@/lib/constants-sekolah'
import { STATUS_PEMBAYARAN_CONFIG } from '@/lib/constants-sekolah'
import type { PesertaPendampingValues } from '@/lib/validations/peserta'
import { compressImage } from '@/lib/compress-image'

interface RiwayatBatch {
  batchKe: number
  statusPembayaran: 'BELUM_BAYAR' | 'MENUNGGU_KONFIRMASI' | 'LUNAS' | 'DITOLAK'
  jumlahBiaya: number
  jumlahPeserta: number
  jumlahPendamping: number
}

export function SusulanReviewPayment({
  sekolahId,
  dataPeserta,
  riwayatBatch,
  batchBerikutnya,
  onBack,
  onSubmitted,
}: {
  sekolahId: string
  dataPeserta: PesertaPendampingValues
  riwayatBatch: RiwayatBatch[]
  batchBerikutnya: number
  onBack: () => void
  onSubmitted: (pembayaranId: string) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const jumlahPeserta = dataPeserta.peserta.length
  const jumlahPendamping = dataPeserta.pendamping.length
  const biayaPeserta = jumlahPeserta * BIAYA_PESERTA
  const biayaPendamping = jumlahPendamping * BIAYA_PENDAMPING
  const total = biayaPeserta + biayaPendamping

  function handleCopyRekening() {
    navigator.clipboard.writeText(REKENING_INFO.nomorRekening)
    toast.success('Nomor rekening disalin')
  }

  async function handleSubmit() {
    if (jumlahPeserta === 0 && jumlahPendamping === 0) {
      toast.error('Minimal 1 peserta atau pendamping susulan harus diisi')
      return
    }
    if (!file) {
      toast.error('Upload bukti transfer dulu sebelum mengirim susulan')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      const pesertaPayload = dataPeserta.peserta.map((item) => {
        const peserta = { ...item }
        Reflect.deleteProperty(peserta, 'foto')
        return peserta
      })
      formData.append('peserta', JSON.stringify(pesertaPayload))
      formData.append('pendamping', JSON.stringify(dataPeserta.pendamping))
      dataPeserta.peserta.forEach((p, i) => formData.append(`foto_${i}`, p.foto))
      formData.append('buktiTransfer', file)

      const res = await fetch(`/api/sekolah/${sekolahId}/susulan`, { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal mengirim pendaftaran susulan')

      toast.success('Pendaftaran susulan & bukti transfer berhasil dikirim!')
      onSubmitted(result.data.pembayaranId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Riwayat batch sebelumnya — supaya pembina sadar ini NAMBAH, bukan menggantikan */}
      {riwayatBatch.length > 0 && (
        <Card>
          <CardHeader variant="blue">
            <h3 className="font-heading text-[10px] text-white flex items-center gap-2">
              <History size={13} />
              RIWAYAT PENDAFTARAN SEKOLAH INI
            </h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {riwayatBatch.map((b) => {
              const cfg = STATUS_PEMBAYARAN_CONFIG[b.statusPembayaran]
              return (
                <div key={b.batchKe} className="flex items-center justify-between font-body text-xs text-event-navy">
                  <span>
                    {b.batchKe === 1 ? 'Batch 1 (Pendaftaran Awal)' : `Batch ${b.batchKe} (Susulan)`} —{' '}
                    {b.jumlahPeserta} peserta, {b.jumlahPendamping} pendamping
                  </span>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
              )
            })}
            <div className="pt-2 border-t-2 border-event-navy/20 font-heading text-xs text-event-navy">
              Susulan ini akan menjadi{' '}
              <span className="font-bold">
                Batch {batchBerikutnya}: +{jumlahPeserta} peserta, +{jumlahPendamping} pendamping
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader variant="yellow">
          <h3 className="font-heading text-[10px] text-event-navy">RINCIAN BIAYA SUSULAN</h3>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span>{jumlahPeserta} Peserta × Rp{BIAYA_PESERTA.toLocaleString('id-ID')}</span>
            <span>Rp{biayaPeserta.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span>{jumlahPendamping} Pendamping × Rp{BIAYA_PENDAMPING.toLocaleString('id-ID')}</span>
            <span>Rp{biayaPendamping.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20">
            <span>TOTAL SUSULAN</span>
            <span>Rp{total.toLocaleString('id-ID')}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader variant="blue">
          <h3 className="font-heading text-[10px] text-white">TRANSFER KE REKENING</h3>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-body text-xs text-event-navy/60">Bank</span>
            <span className="font-body font-bold text-sm text-event-navy">{REKENING_INFO.namaBank}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-body text-xs text-event-navy/60">No. Rekening</span>
            <div className="flex items-center gap-2">
              <span className="font-body font-bold text-sm text-event-navy">{REKENING_INFO.nomorRekening}</span>
              <button
                type="button"
                onClick={handleCopyRekening}
                className="w-6 h-6 flex items-center justify-center bg-event-blue text-white border-2 border-event-navy"
              >
                <Copy size={11} />
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-body text-xs text-event-navy/60">Atas Nama</span>
            <span className="font-body font-bold text-sm text-event-navy">{REKENING_INFO.atasNama}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <label className="font-body font-bold text-sm text-event-navy">Upload Bukti Transfer Susulan</label>
        <label className="flex flex-col items-center justify-center gap-2 border-3 border-dashed border-event-navy bg-event-cream/50 py-8 cursor-pointer hover:bg-event-cream transition-colors">
          {file ? (
            <>
              <FileText size={28} className="text-event-navy" />
              <span className="font-body text-xs font-bold text-event-navy">{file.name}</span>
            </>
          ) : (
            <>
              <Upload size={28} className="text-event-navy" />
              <span className="font-body text-xs font-bold text-event-navy">Klik untuk upload bukti transfer</span>
              <span className="font-body text-[10px] text-event-navy/60">JPG, PNG, atau PDF — maksimal 5MB</span>
            </>
          )}
          <input
            type="file"
            accept={ACCEPTED_BUKTI_TYPES.join(',')}
            className="hidden"
            onChange={async (e) => {
              const selected = e.target.files?.[0] ?? null
              if (!selected) return setFile(null)
              try {
                const compressed = await compressImage(selected, 1200, 0.85)
                setFile(compressed)
              } catch {
                setFile(selected)
              }
            }}
          />
        </label>
      </div>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Kembali
        </Button>
        <Button type="button" variant="primary" onClick={handleSubmit} isLoading={isSubmitting} disabled={!file}>
          Kirim Pendaftaran Susulan
        </Button>
      </div>
    </div>
  )
}
