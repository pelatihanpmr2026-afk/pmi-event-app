'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ACCEPTED_BUKTI_TYPES, REKENING_INFO } from '@/lib/constants-sekolah'
import { compressImage } from '@/lib/compress-image'

interface ReservationDetail {
  namaSekolah: string
  kategori: string
  estimasiPesertaPendamping: number
  expiresAt: string
  tendaSewaList: { nama: string; jumlah: number; hargaSatuan: number; subtotal: number }[]
  jumlahBiaya: number
}

export function DraftPayment({ reservationId }: { reservationId: string }) {
  const router = useRouter()
  const [detail, setDetail] = useState<ReservationDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sisaMenit, setSisaMenit] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/tenda/reservasi/${encodeURIComponent(reservationId)}`)
        const result = await res.json()
        if (!res.ok) {
          setLoadError(result?.message || 'Gagal memuat detail reservasi')
          return
        }
        if (!cancelled) setDetail(result.data)
      } catch {
        if (!cancelled) setLoadError('Gagal memuat detail reservasi')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [reservationId])

  useEffect(() => {
    const update = () => setSisaMenit(Math.max(0, Math.ceil((new Date(detail?.expiresAt ?? 0).getTime() - Date.now()) / 60000)))
    update()
    const timer = window.setInterval(update, 30000)
    return () => window.clearInterval(timer)
  }, [detail?.expiresAt])

  async function pilihFile(selected: File | null) {
    if (!selected) return setFile(null)
    try {
      setFile(await compressImage(selected, 1200, 0.85))
    } catch {
      setFile(selected)
    }
  }

  async function submit() {
    if (!file) return toast.error('Pilih bukti transfer terlebih dahulu')
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('reservationId', reservationId)
      form.append('buktiTransfer', file)
      const res = await fetch('/api/tenda/draft-payment', { method: 'POST', body: form })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Gagal mengirim pembayaran')
      toast.success('Bukti transfer berhasil dikirim')
      router.replace(`/tenda/pembayaran/${result.data.sekolahId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="py-10 text-center"><p className="font-body text-sm text-event-navy/50">Memuat detail reservasi...</p></div>
  }

  if (loadError || !detail) {
    return <div className="border-3 border-pmi-red bg-pmi-red/10 p-4 text-center font-body text-sm text-event-navy">{loadError || 'Data pilihan tenda tidak ditemukan. Silakan mulai kembali dari halaman sewa tenda.'}</div>
  }

  return <div className="flex flex-col gap-4">
    <div className="border-3 border-event-navy bg-white p-4">
      <p className="font-body font-bold text-sm text-event-navy">{detail.namaSekolah.toUpperCase()}</p>
      <p className="font-body text-xs text-event-navy/60">Kategori {detail.kategori} · Estimasi {detail.estimasiPesertaPendamping} orang</p>
      <p className="font-body text-xs text-event-navy/60">Data sekolah akan disimpan setelah bukti transfer dikirim.</p>
      {sisaMenit <= 15 && <p className="font-body text-[11px] text-pmi-red mt-1">Reservasi tersisa ±{sisaMenit} menit. Selesaikan pembayaran sebelum waktu habis agar stok tetap terkunci.</p>}
    </div>
    <Card>
      <CardHeader variant="blue">
        <h3 className="font-heading text-[10px] text-white">RINCIAN BIAYA SEWA TENDA</h3>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {detail.tendaSewaList.map((item) => (
          <div key={item.nama} className="flex justify-between gap-3 font-body text-xs text-event-navy">
            <span>{item.nama} x {item.jumlah} unit (Rp{item.hargaSatuan.toLocaleString('id-ID')})</span>
            <span className="shrink-0">Rp{item.subtotal.toLocaleString('id-ID')}</span>
          </div>
        ))}
        <div className="flex justify-between border-t-2 border-event-navy/20 pt-2 font-heading text-xs text-event-navy">
          <span>TOTAL YANG HARUS DITRANSFER</span>
          <span>Rp{detail.jumlahBiaya.toLocaleString('id-ID')}</span>
        </div>
        <p className="font-body text-[11px] text-event-navy/70">Transfer tepat sesuai nominal agar verifikasi lebih cepat.</p>
      </CardContent>
    </Card>
    <div className="border-3 border-event-blue bg-event-blue/10 p-4 font-body text-xs text-event-navy">Transfer ke {REKENING_INFO.namaBank} — <b>{REKENING_INFO.nomorRekening}</b> a.n. {REKENING_INFO.atasNama}</div>
    <label className="flex cursor-pointer flex-col items-center gap-2 border-3 border-dashed border-event-navy bg-event-cream p-8 font-body text-xs">
      <span>{file ? file.name : 'Klik untuk memilih bukti transfer'}</span>
      <span className="font-body text-[10px] text-event-navy/60">JPG, PNG, atau PDF - maksimal 5MB</span>
      <input type="file" accept={ACCEPTED_BUKTI_TYPES.join(',')} className="hidden" onChange={(event) => void pilihFile(event.target.files?.[0] ?? null)} />
    </label>
    <Button type="button" variant="primary" onClick={submit} isLoading={submitting} disabled={!file}>Kirim Bukti Transfer</Button>
  </div>
}