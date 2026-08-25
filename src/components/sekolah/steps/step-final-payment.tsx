'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SignaturePad } from '@/components/ui/signature-pad'
import { ACCEPTED_BUKTI_TYPES, REKENING_INFO } from '@/lib/constants-sekolah'
import { compressImage } from '@/lib/compress-image'
import { RincianBiaya } from '../biaya-rincian'
import { TNC_VERSION } from '@/lib/tnc-content'
import type { DataSekolahResult } from './step-data-sekolah'
import type { PesertaPendampingValues } from '@/lib/validations/peserta'

export function StepFinalPayment({ dataSekolah, dataPeserta, onBack, onSubmitted }: { dataSekolah: DataSekolahResult; dataPeserta: PesertaPendampingValues; onBack: () => void; onSubmitted: (sekolahId: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const jumlahPeserta = dataPeserta.peserta.length
  const jumlahPendamping = dataPeserta.pendamping.length

  async function pilihFile(selected: File | null) {
    if (!selected) return setFile(null)
    try { setFile(await compressImage(selected, 1200, 0.85)) } catch { setFile(selected) }
  }

  async function handleSubmit() {
    if (!file) return toast.error('Upload bukti transfer dulu sebelum mengirim pendaftaran')
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('dataSekolah', JSON.stringify({ namaSekolah: dataSekolah.namaSekolah, kategori: dataSekolah.kategori, namaPembina: dataSekolah.namaPembina, noWhatsappPembina: dataSekolah.noWhatsappPembina, existingSekolahId: dataSekolah.existingSekolahId }))
      formData.append('peserta', JSON.stringify(dataPeserta.peserta.map((peserta) => { const { foto: _foto, ...rest } = peserta; return rest })))
      formData.append('pendamping', JSON.stringify(dataPeserta.pendamping))
      dataPeserta.peserta.forEach((peserta, index) => formData.append(`foto_${index}`, peserta.foto))
      formData.append('buktiTransfer', file)
      formData.append('termsVersion', TNC_VERSION)
      if (signature) {
        const signatureResponse = await fetch(signature)
        formData.append('tandaTanganPenanggungJawab', await signatureResponse.blob(), 'ttd-penanggung-jawab.png')
      }
      const response = await fetch('/api/sekolah', { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.message || 'Gagal mengirim pendaftaran')
      toast.success('Data dan bukti transfer berhasil dikirim')
      onSubmitted(result.data.sekolahId)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan') } finally { setIsSubmitting(false) }
  }

  return <div className="flex flex-col gap-5">
    <Card pixel><CardHeader variant="yellow" pixel><h3 className="font-heading text-[10px] text-event-navy">RINCIAN BIAYA</h3></CardHeader><CardContent><RincianBiaya jumlahPeserta={jumlahPeserta} jumlahPendamping={jumlahPendamping} /></CardContent></Card>
    <Card pixel><CardHeader variant="blue" pixel><h3 className="font-heading text-[10px] text-white">TRANSFER KE REKENING</h3></CardHeader><CardContent className="flex flex-col gap-2">
      <div className="flex justify-between items-center"><span className="font-body text-xs text-event-navy/60">Bank</span><span className="font-body font-bold text-sm text-event-navy">{REKENING_INFO.namaBank}</span></div>
      <div className="flex justify-between items-center"><span className="font-body text-xs text-event-navy/60">No. Rekening</span><div className="flex items-center gap-2"><span className="font-body font-bold text-sm text-event-navy">{REKENING_INFO.nomorRekening}</span><button type="button" aria-label="Salin nomor rekening" onClick={() => { navigator.clipboard.writeText(REKENING_INFO.nomorRekening); toast.success('Nomor rekening disalin') }} className="w-10 h-10 flex items-center justify-center bg-event-blue text-white border-2 border-event-navy shrink-0"><Copy size={14} /></button></div></div>
      <div className="flex justify-between items-center"><span className="font-body text-xs text-event-navy/60">Atas Nama</span><span className="font-body font-bold text-sm text-event-navy">{REKENING_INFO.atasNama}</span></div>
    </CardContent></Card>
    <div className="flex flex-col gap-2"><label className="font-body font-bold text-sm text-event-navy">Upload Bukti Transfer</label><label className="flex flex-col items-center justify-center gap-2 border-3 border-dashed border-event-navy bg-event-cream/50 py-8 cursor-pointer hover:bg-event-cream transition-colors shadow-pixel-sm">{file ? <><FileText size={28} className="text-event-navy" /><span className="font-body text-xs font-bold text-event-navy">{file.name}</span></> : <><Upload size={28} className="text-event-navy" /><span className="font-body text-xs font-bold text-event-navy">Klik untuk upload bukti transfer</span><span className="font-body text-[10px] text-event-navy/60">JPG, PNG, atau PDF - maksimal 5MB</span></>}<input type="file" accept={ACCEPTED_BUKTI_TYPES.join(',')} className="hidden" onChange={(event) => void pilihFile(event.target.files?.[0] ?? null)} /></label></div>
    <div className="flex flex-col gap-2"><label className="font-body font-bold text-sm text-event-navy">Tanda Tangan Penanggung Jawab Sekolah (Opsional)</label><SignaturePad onChange={setSignature} /><p className="font-body text-[11px] text-event-navy/50">Bila dikosongkan, surat pernyataan tetap dibuat dengan kolom tanda tangan manual.</p></div>
    <div className="flex justify-between gap-3"><Button type="button" variant="outline" pixel onClick={onBack} disabled={isSubmitting}>Kembali</Button><Button type="button" variant="primary" pixel onClick={handleSubmit} isLoading={isSubmitting} disabled={!file}>Kirim Pendaftaran</Button></div>
  </div>
}
