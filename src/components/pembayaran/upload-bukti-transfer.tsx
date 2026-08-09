'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Upload, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { REKENING_INFO, ACCEPTED_BUKTI_TYPES } from '@/lib/constants-sekolah'

interface PembayaranInfo {
  id: string
  tipe: 'PESERTA' | 'TENDA'
  namaLengkap: string
  kodePendaftaran: string
  jumlahBiaya: number
  statusPembayaran: 'BELUM_BAYAR' | 'MENUNGGU_KONFIRMASI' | 'LUNAS' | 'DITOLAK'
  buktiTransferUrl: string | null
  catatanAdmin: string | null
  jumlahPeserta?: number
  jumlahPendamping?: number
  tendaSewaList?: { nama: string; jumlah: number; hargaSatuan: number; subtotal: number }[]
  kwitansiUrl?: string | null
}

const STATUS_CONFIG = {
  BELUM_BAYAR: { label: 'Belum Bayar', variant: 'warning' as const, icon: Clock },
  MENUNGGU_KONFIRMASI: { label: 'Menunggu Konfirmasi', variant: 'info' as const, icon: Clock },
  LUNAS: { label: 'Lunas', variant: 'success' as const, icon: CheckCircle2 },
  DITOLAK: { label: 'Ditolak', variant: 'default' as const, icon: XCircle },
}

export function UploadBuktiTransfer({
  sekolahId,
  tipe,
  title,
}: {
  sekolahId: string
  tipe: 'peserta' | 'tenda'
  title: string
}) {
  const [info, setInfo] = useState<PembayaranInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function fetchInfo() {
    try {
      const res = await fetch(`/api/sekolah/${sekolahId}/pembayaran/${tipe}`)
      const result = await res.json()
      if (result.success) setInfo(result.data)
      else toast.error(result.message || 'Gagal memuat data pembayaran')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, tipe])

  function handleCopyRekening() {
    navigator.clipboard.writeText(REKENING_INFO.nomorRekening)
    toast.success('Nomor rekening disalin')
  }

  async function handleUpload() {
    if (!file) {
      toast.error('Pilih file bukti transfer dulu')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('buktiTransfer', file)

      const res = await fetch(`/api/sekolah/${sekolahId}/pembayaran/${tipe}`, {
        method: 'POST',
        body: formData,
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result?.message || 'Gagal upload bukti transfer')

      toast.success('Bukti transfer berhasil diupload')
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      await fetchInfo()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-10 text-center">
        <p className="font-body text-sm text-event-navy/50">Memuat data pembayaran...</p>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="border-3 border-pmi-red bg-pmi-red/10 p-4 text-center">
        <p className="font-body text-sm text-event-navy">Data pembayaran tidak ditemukan</p>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[info.statusPembayaran]
  const StatusIcon = statusConfig.icon
  const bisaUpload = info.statusPembayaran === 'BELUM_BAYAR' || info.statusPembayaran === 'DITOLAK'

  return (
    <div className="flex flex-col gap-5">
      <div className="border-3 border-event-navy bg-white p-4">
        <p className="font-body font-bold text-sm text-event-navy">{info.namaLengkap}</p>
        <p className="font-body text-xs text-event-navy/60">{info.kodePendaftaran}</p>
        <div className="mt-2">
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader variant="yellow">
          <h3 className="font-heading text-[10px] text-event-navy">{title}</h3>
        </CardHeader>
       <CardContent className="flex flex-col gap-2">
  {typeof info.jumlahPeserta === 'number' && (
    <div className="flex justify-between font-body text-xs text-event-navy">
      <span>{info.jumlahPeserta} Peserta × Rp35.000</span>
      <span>Rp{(info.jumlahPeserta * 35000).toLocaleString('id-ID')}</span>
    </div>
  )}
  {typeof info.jumlahPendamping === 'number' && (
    <div className="flex justify-between font-body text-xs text-event-navy">
      <span>{info.jumlahPendamping} Pendamping × Rp25.000</span>
      <span>Rp{(info.jumlahPendamping * 25000).toLocaleString('id-ID')}</span>
    </div>
  )}
  {info.tendaSewaList?.map((t) => (
    <div key={t.nama} className="flex justify-between font-body text-xs text-event-navy">
      <span>
        {t.nama} × {t.jumlah} unit (Rp{t.hargaSatuan.toLocaleString('id-ID')})
      </span>
      <span>Rp{t.subtotal.toLocaleString('id-ID')}</span>
    </div>
  ))}
  <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20">
    <span>TOTAL</span>
    <span>Rp{info.jumlahBiaya.toLocaleString('id-ID')}</span>
  </div>
</CardContent>
      </Card>

      {info.statusPembayaran === 'DITOLAK' && info.catatanAdmin && (
        <div className="border-3 border-pmi-red bg-pmi-red/10 p-4">
          <p className="font-body font-bold text-xs text-pmi-red mb-1">Alasan Penolakan:</p>
          <p className="font-body text-xs text-event-navy">{info.catatanAdmin}</p>
        </div>
      )}

      {bisaUpload && (
        <>
          <Card>
            <CardHeader variant="blue">
              <h3 className="font-heading text-[10px] text-white">TRANSFER KE REKENING</h3>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-body text-xs text-event-navy/60">Bank</span>
                <span className="font-body font-bold text-sm text-event-navy">
                  {REKENING_INFO.namaBank}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body text-xs text-event-navy/60">No. Rekening</span>
                <div className="flex items-center gap-2">
                  <span className="font-body font-bold text-sm text-event-navy">
                    {REKENING_INFO.nomorRekening}
                  </span>
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
                <span className="font-body font-bold text-sm text-event-navy">
                  {REKENING_INFO.atasNama}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <label className="font-body font-bold text-sm text-event-navy">
              Upload Bukti Transfer
            </label>
            <label className="flex flex-col items-center justify-center gap-2 border-3 border-dashed border-event-navy bg-event-cream/50 py-8 cursor-pointer hover:bg-event-cream transition-colors">
              {file ? (
                <>
                  <FileText size={28} className="text-event-navy" />
                  <span className="font-body text-xs font-bold text-event-navy">{file.name}</span>
                </>
              ) : (
                <>
                  <Upload size={28} className="text-event-navy" />
                  <span className="font-body text-xs font-bold text-event-navy">
                    Klik untuk upload bukti transfer
                  </span>
                  <span className="font-body text-[10px] text-event-navy/60">
                    JPG, PNG, atau PDF — maksimal 5MB
                  </span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_BUKTI_TYPES.join(',')}
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleUpload}
            isLoading={isSubmitting}
            disabled={!file}
          >
            Kirim Bukti Transfer
          </Button>
        </>
      )}
{info.statusPembayaran === 'MENUNGGU_KONFIRMASI' && (
  <div className="flex flex-col gap-3">
    <div className="border-3 border-event-blue bg-event-blue/10 p-4 flex items-center gap-3">
      <StatusIcon size={24} className="text-event-blue shrink-0" />
      <p className="font-body text-xs text-event-navy">
        Bukti transfer sudah kami terima dan sedang menunggu konfirmasi panitia. Kwitansi sudah
        bisa kamu download sekarang — status terkini bisa dicek kapan saja dengan scan QR Code di
        kwitansi tersebut.
      </p>
    </div>
    {info.kwitansiUrl && (
      <a href={info.kwitansiUrl} download={`Kwitansi-${info.kodePendaftaran}.pdf`}>
        <Button variant="secondary" className="w-full">
          Download Kwitansi
        </Button>
      </a>
    )}
  </div>
)}

     {info.statusPembayaran === 'LUNAS' && (
  <div className="flex flex-col gap-3">
    <div className="border-3 border-green-600 bg-green-50 p-4 flex items-center gap-3">
      <StatusIcon size={24} className="text-green-600 shrink-0" />
      <p className="font-body text-xs text-event-navy">
        Pembayaran sudah dikonfirmasi lunas.
      </p>
    </div>
    {info.kwitansiUrl && (
      <a href={info.kwitansiUrl} download={`Kwitansi-${info.kodePendaftaran}.pdf`}>
        <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
          Download Kwitansi
        </Button>
      </a>
    )}
  </div>
)}
    </div>
  )
}