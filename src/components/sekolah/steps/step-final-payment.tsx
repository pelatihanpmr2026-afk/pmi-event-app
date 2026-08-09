'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Upload, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { REKENING_INFO, ACCEPTED_BUKTI_TYPES, BIAYA_PESERTA, BIAYA_PENDAMPING } from '@/lib/constants-sekolah'
import type { DataSekolahResult } from './step-data-sekolah'
import type { PesertaPendampingValues } from '@/lib/validations/peserta'

export function StepFinalPayment({
  dataSekolah,
  dataPeserta,
  onBack,
  onSubmitted,
}: {
  dataSekolah: DataSekolahResult
  dataPeserta: PesertaPendampingValues
  onBack: () => void
  onSubmitted: (sekolahId: string) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const jumlahPeserta = dataPeserta.peserta.length
  const jumlahPendamping = dataPeserta.pendamping.length
  const total = jumlahPeserta * BIAYA_PESERTA + jumlahPendamping * BIAYA_PENDAMPING

  function handleCopyRekening() {
    navigator.clipboard.writeText(REKENING_INFO.nomorRekening)
    toast.success('Nomor rekening disalin')
  }

  async function handleSubmit() {
    if (!file) {
      toast.error('Upload bukti transfer dulu sebelum mengirim pendaftaran')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append(
        'dataSekolah',
        JSON.stringify({
          jenjang: dataSekolah.jenjang,
          statusSekolah: dataSekolah.statusSekolah,
          namaInput: dataSekolah.namaInput,
          namaPembina: dataSekolah.namaPembina,
          noWhatsappPembina: dataSekolah.noWhatsappPembina,
          existingSekolahId: dataSekolah.existingSekolahId,
        })
      )
      formData.append('peserta', JSON.stringify(dataPeserta.peserta.map(({ foto, ...rest }) => rest)))
      formData.append('pendamping', JSON.stringify(dataPeserta.pendamping))
      dataPeserta.peserta.forEach((p, i) => formData.append(`foto_${i}`, p.foto))
      formData.append('buktiTransfer', file)

      const res = await fetch('/api/sekolah', { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal mengirim pendaftaran')

      toast.success('Pendaftaran & bukti transfer berhasil dikirim!')
      onSubmitted(result.data.sekolahId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader variant="yellow">
          <h3 className="font-heading text-[10px] text-event-navy">RINCIAN BIAYA</h3>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span>{jumlahPeserta} Peserta × Rp35.000</span>
            <span>Rp{(jumlahPeserta * BIAYA_PESERTA).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span>{jumlahPendamping} Pendamping × Rp25.000</span>
            <span>Rp{(jumlahPendamping * BIAYA_PENDAMPING).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20">
            <span>TOTAL</span>
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
        <label className="font-body font-bold text-sm text-event-navy">Upload Bukti Transfer</label>
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
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Kembali
        </Button>
        <Button type="button" variant="primary" onClick={handleSubmit} isLoading={isSubmitting} disabled={!file}>
          Kirim Pendaftaran
        </Button>
      </div>
    </div>
  )
}