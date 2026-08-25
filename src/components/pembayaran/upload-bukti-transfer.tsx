'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Upload, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ACCEPTED_BUKTI_TYPES, REKENING_INFO } from '@/lib/constants-sekolah'
import { compressImage } from '@/lib/compress-image'
import { RincianBiaya } from '@/components/sekolah/biaya-rincian'
import { VerifikasiSekolahForm } from '@/components/verifikasi-sekolah-form'
import { PaymentStatusStepper } from './payment-status-stepper'

interface PembayaranInfo { id: string; tipe: 'PESERTA' | 'TENDA'; namaLengkap: string; kodePendaftaran: string; jumlahBiaya: number; statusPembayaran: 'BELUM_BAYAR' | 'MENUNGGU_KONFIRMASI' | 'LUNAS' | 'DITOLAK'; buktiTransferUrl: string | null; catatanAdmin: string | null; jumlahPeserta?: number; jumlahPendamping?: number; tendaSewaList?: { nama: string; jumlah: number; hargaSatuan: number; subtotal: number }[]; kwitansiUrl?: string | null; suratPernyataanUrl?: string | null }
const STATUS_CONFIG = { BELUM_BAYAR: { label: 'Belum Bayar', variant: 'warning' as const, icon: Clock }, MENUNGGU_KONFIRMASI: { label: 'Menunggu Konfirmasi', variant: 'info' as const, icon: Clock }, LUNAS: { label: 'Lunas', variant: 'success' as const, icon: CheckCircle2 }, DITOLAK: { label: 'Perlu diperbaiki', variant: 'default' as const, icon: XCircle } }

// Tombol download kwitansi + surat pernyataan — dipakai ulang di beberapa status
// supaya tidak duplikat render (U4).
function DownloadDokumen({ kwitansiUrl, suratPernyataanUrl, kodePendaftaran }: { kwitansiUrl?: string | null; suratPernyataanUrl?: string | null; kodePendaftaran: string }) {
  if (!kwitansiUrl && !suratPernyataanUrl) return null
  return (
    <>
      {kwitansiUrl && <a href={kwitansiUrl} download={`Kwitansi-${kodePendaftaran}.pdf`}><Button variant="secondary" className="w-full">Download Kwitansi</Button></a>}
      {suratPernyataanUrl && <a href={suratPernyataanUrl} download={`Surat-Pernyataan-${kodePendaftaran}.pdf`}><Button variant="outline" className="w-full">Download Surat Pernyataan</Button></a>}
    </>
  )
}

export function UploadBuktiTransfer({ sekolahId, tipe, title, pembayaranId }: { sekolahId: string; tipe: 'peserta' | 'tenda'; title: string; pembayaranId?: string }) {
  const [info, setInfo] = useState<PembayaranInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [butuhVerifikasi, setButuhVerifikasi] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const query = pembayaranId ? `?pembayaranId=${encodeURIComponent(pembayaranId)}` : ''

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/sekolah/${sekolahId}/pembayaran/${tipe}${query}`)
      const result = await res.json()
      if (result.success) setInfo(result.data)
      else toast.error(result.message || 'Gagal memuat data pembayaran')
    } finally {
      setIsLoading(false)
    }
  }, [sekolahId, tipe, query])

  useEffect(() => { void fetchInfo() }, [fetchInfo])

  // Polling status otomatis: saat menunggu konfirmasi / belum bayar / ditolak,
  // refresh status tiap 15 detik supaya pembina tidak perlu refresh manual
  // untuk melihat pembayaran dikonfirmasi panitia. Berhenti setelah LUNAS.
  const statusLunas = info?.statusPembayaran === 'LUNAS'
  useEffect(() => {
    if (statusLunas) return
    const timer = setInterval(() => { void fetchInfo() }, 15000)
    return () => clearInterval(timer)
  }, [statusLunas, fetchInfo])

  async function handleUpload() {
    if (!file) return toast.error('Pilih file bukti transfer dulu')
    setIsSubmitting(true)
    try {
      const formData = new FormData(); formData.append('buktiTransfer', file)
      const res = await fetch(`/api/sekolah/${sekolahId}/pembayaran/${tipe}${query}`, { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal upload bukti transfer')
      toast.success('Bukti transfer berhasil dikirim'); setFile(null); if (inputRef.current) inputRef.current.value = ''; await fetchInfo()
    } catch (error) {
      const pesan = error instanceof Error ? error.message : 'Terjadi kesalahan'
      if (tipe === 'peserta' && (error instanceof Error && error.message.includes('Sesi pembayaran'))) {
        setButuhVerifikasi(true)
        toast.error('Verifikasi diperlukan untuk mengirim bukti transfer')
      } else {
        toast.error(pesan)
      }
    } finally { setIsSubmitting(false) }
  }

  async function pilihFile(selected: File | null) {
    if (!selected) return setFile(null)
    // Kompres gambar dari HP agar muat di batas 5MB & nama file konsisten
    // dengan isi (JPEG) supaya tidak ditolak validasi magic-bytes di server.
    try { setFile(await compressImage(selected, 1200, 0.85)) } catch { setFile(selected) }
  }

  if (isLoading) return <div className="py-10 text-center"><p className="font-body text-sm text-event-navy/50">Memuat data pembayaran...</p></div>
  if (!info) return <div className="border-3 border-pmi-red bg-pmi-red/10 p-4 text-center"><p className="font-body text-sm text-event-navy">Data pembayaran tidak ditemukan</p></div>
  const status = STATUS_CONFIG[info.statusPembayaran]
  const StatusIcon = status.icon
  const bisaUpload = info.statusPembayaran === 'BELUM_BAYAR' || info.statusPembayaran === 'DITOLAK'

  return <div className="flex flex-col gap-5">
    <div className="border-3 border-event-navy bg-white p-4"><p className="font-body font-bold text-sm text-event-navy">{info.namaLengkap}</p><p className="font-body text-xs text-event-navy/60">{info.kodePendaftaran}</p><div className="mt-2"><Badge variant={status.variant}>{status.label}</Badge></div></div>
    <PaymentStatusStepper status={info.statusPembayaran} />
    <Card><CardHeader variant="yellow"><h3 className="font-heading text-[10px] text-event-navy">{title}</h3></CardHeader><CardContent>{typeof info.jumlahPeserta === 'number' ? <RincianBiaya jumlahPeserta={info.jumlahPeserta} jumlahPendamping={info.jumlahPendamping ?? 0} /> : <div className="flex flex-col gap-2">{info.tendaSewaList?.map((t) => <div key={t.nama} className="flex justify-between gap-3 font-body text-xs text-event-navy"><span>{t.nama} x {t.jumlah} unit (Rp{t.hargaSatuan.toLocaleString('id-ID')})</span><span>Rp{t.subtotal.toLocaleString('id-ID')}</span></div>)}<div className="flex justify-between border-t-2 border-event-navy/20 pt-2 font-heading text-xs text-event-navy"><span>TOTAL YANG HARUS DITRANSFER</span><span>Rp{info.jumlahBiaya.toLocaleString('id-ID')}</span></div><p className="font-body text-[11px] text-event-navy/70">Transfer tepat sesuai nominal agar verifikasi lebih cepat.</p></div>}</CardContent></Card>
    {info.statusPembayaran === 'DITOLAK' && <div className="border-3 border-pmi-red bg-pmi-red/10 p-4"><p className="font-body font-bold text-xs text-pmi-red mb-1">Alasan bukti transfer perlu diperbaiki:</p><p className="font-body text-xs text-event-navy">{info.catatanAdmin || 'Panitia meminta bukti transfer baru.'}</p></div>}
    {butuhVerifikasi && (
      <VerifikasiSekolahForm
        title="VERIFIKASI KEPEMILIKAN SEKOLAH"
        description="Untuk melindungi data Anda, kirim bukti transfer memerlukan verifikasi No. WhatsApp pembina yang terdaftar."
        endpoint={`/api/sekolah/${sekolahId}/pembayaran/verify`}
        buttonLabel="Verifikasi & Lanjut Upload"
        onSuccess={() => {
          toast.success('Verifikasi berhasil, silakan upload ulang')
          setButuhVerifikasi(false)
        }}
      />
    )}
    {bisaUpload && !butuhVerifikasi && <><Card><CardHeader variant="blue"><h3 className="font-heading text-[10px] text-white">TRANSFER KE REKENING</h3></CardHeader><CardContent className="flex flex-col gap-2"><div className="flex justify-between"><span className="font-body text-xs text-event-navy/60">Bank</span><span className="font-body font-bold text-sm text-event-navy">{REKENING_INFO.namaBank}</span></div><div className="flex justify-between items-center"><span className="font-body text-xs text-event-navy/60">No. Rekening</span><div className="flex items-center gap-2"><span className="font-body font-bold text-sm text-event-navy">{REKENING_INFO.nomorRekening}</span><button type="button" aria-label="Salin nomor rekening" onClick={() => { navigator.clipboard.writeText(REKENING_INFO.nomorRekening); toast.success('Nomor rekening disalin') }} className="w-10 h-10 flex items-center justify-center bg-event-blue text-white border-2 border-event-navy shrink-0"><Copy size={14} /></button></div></div><div className="flex justify-between"><span className="font-body text-xs text-event-navy/60">Atas Nama</span><span className="font-body font-bold text-sm text-event-navy">{REKENING_INFO.atasNama}</span></div></CardContent></Card><div className="flex flex-col gap-2"><label className="font-body font-bold text-sm text-event-navy">{info.statusPembayaran === 'DITOLAK' ? 'Upload Bukti Transfer Baru' : 'Upload Bukti Transfer'}</label><label className="flex flex-col items-center justify-center gap-2 border-3 border-dashed border-event-navy bg-event-cream/50 py-8 cursor-pointer"><>{file ? <><FileText size={28} /><span className="font-body text-xs font-bold">{file.name}</span></> : <><Upload size={28} /><span className="font-body text-xs font-bold">Klik untuk upload bukti transfer</span><span className="font-body text-[10px] text-event-navy/60">JPG, PNG, atau PDF - maksimal 5MB</span></>}</><input ref={inputRef} type="file" accept={ACCEPTED_BUKTI_TYPES.join(',')} className="hidden" onChange={(event) => void pilihFile(event.target.files?.[0] ?? null)} /></label></div><Button type="button" variant="primary" onClick={handleUpload} isLoading={isSubmitting} disabled={!file}>{info.statusPembayaran === 'DITOLAK' ? 'Upload Bukti Transfer Baru' : 'Kirim Bukti Transfer'}</Button></>}
    {info.statusPembayaran === 'MENUNGGU_KONFIRMASI' && <div className="flex flex-col gap-3"><div className="border-3 border-event-blue bg-event-blue/10 p-4 flex items-center gap-3"><StatusIcon size={24} className="shrink-0 text-event-blue" /><p className="font-body text-xs text-event-navy">Bukti transfer Anda sudah diterima. Panitia akan memverifikasi pembayaran. Pendaftaran belum dinyatakan lunas sampai status berubah menjadi “Lunas”. Halaman ini diperbarui otomatis — Anda tidak perlu me-refresh.</p></div><DownloadDokumen kwitansiUrl={info.kwitansiUrl} suratPernyataanUrl={info.suratPernyataanUrl} kodePendaftaran={info.kodePendaftaran} /></div>}
    {info.statusPembayaran === 'LUNAS' && <div className="flex flex-col gap-3"><div className="border-3 border-green-600 bg-green-50 p-4 flex items-center gap-3"><StatusIcon size={24} className="shrink-0 text-green-600" /><p className="font-body text-xs text-event-navy">Pembayaran sudah dikonfirmasi lunas.</p></div><DownloadDokumen kwitansiUrl={info.kwitansiUrl} suratPernyataanUrl={info.suratPernyataanUrl} kodePendaftaran={info.kodePendaftaran} /></div>}
  </div>
}
