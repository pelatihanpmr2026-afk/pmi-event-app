'use client'

import { useEffect, useState } from 'react'
import { Check, X, RefreshCw, Inbox, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Pembayaran = {
  id: string
  tipe: 'PESERTA' | 'TENDA'
  batchKe: number
  jumlahBiaya: number
  buktiTransferUrl?: string | null
  updatedAt: string
  sekolah: {
    namaLengkap: string
    kodePendaftaran: string
    noWhatsappPembina?: string | null
  }
}

const TIPE_LABEL: Record<Pembayaran['tipe'], string> = { PESERTA: 'Peserta', TENDA: 'Tenda' }

function formatRp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AntrianKonfirmasi() {
  const [items, setItems] = useState<Pembayaran[] | null>(null)
  const [error, setError] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [tolakId, setTolakId] = useState<string | null>(null)
  const [catatanTolak, setCatatanTolak] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/pembayaran/antrian')
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return
        if (result.success) setItems(result.data)
        else setError(true)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // Auto-refresh tiap 20 detik supaya antrian baru tidak terlewat tanpa klik
  // manual (panitia bisa membiarkan halaman terbuka sambil bekerja).
  useEffect(() => {
    const timer = setInterval(() => setReloadKey((k) => k + 1), 20000)
    return () => clearInterval(timer)
  }, [])

  const reload = () => setReloadKey((k) => k + 1)

  const aksi = async (id: string, aksiNama: 'LUNAS' | 'DITOLAK') => {
    if (aksiNama === 'DITOLAK') {
      setTolakId(id)
      setCatatanTolak('')
      return
    }
    await kirim(id, { aksi: 'LUNAS' })
  }

  const batalTolak = () => {
    setTolakId(null)
    setCatatanTolak('')
  }

  const konfirmasiTolak = async (id: string) => {
    await kirim(id, { aksi: 'DITOLAK', catatanAdmin: catatanTolak.trim() || undefined })
    batalTolak()
  }

  const kirim = async (id: string, body: { aksi: 'LUNAS' | 'DITOLAK'; catatanAdmin?: string }) => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/pembayaran/${id}/konfirmasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!result.success) {
        window.alert(result.message ?? 'Gagal memproses pembayaran')
        return
      }
      setItems((prev) => (prev ? prev.filter((p) => p.id !== id) : prev))
    } catch {
      window.alert('Terjadi kesalahan pada server')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-[11px] text-event-navy">
            ANTRIAN KONFIRMASI PEMBAYARAN
            {items !== null && items.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 bg-event-pink text-white font-body font-bold text-[10px] rounded-full">
                {items.length}
              </span>
            )}
          </h2>
          <button
            onClick={reload}
            className="inline-flex items-center gap-1 font-body text-[10px] text-event-blue hover:underline"
          >
            <RefreshCw size={12} /> Muat ulang
          </button>
        </div>

        {error && (
          <p className="font-body text-xs text-pmi-red">Gagal memuat antrian pembayaran.</p>
        )}

        {items === null && !error && (
          <p className="font-body text-xs text-event-navy/60">Memuat antrian…</p>
        )}

        {items !== null && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-event-navy/50">
            <Inbox size={28} />
            <p className="font-body text-xs">Tidak ada pembayaran yang menunggu konfirmasi.</p>
          </div>
        )}

        {items?.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 border border-[var(--color-border)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-body text-xs font-bold text-event-navy">{p.sekolah.namaLengkap}</span>
              <span className="font-body text-[10px] text-event-navy/50">
                {TIPE_LABEL[p.tipe]} · Batch {p.batchKe}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 font-body text-[11px] text-event-navy/70">
              <span>Kode: {p.sekolah.kodePendaftaran}</span>
              {p.sekolah.noWhatsappPembina && <span>WA: {p.sekolah.noWhatsappPembina}</span>}
              <span>
                Jumlah: <span className="font-bold text-event-navy">{formatRp(p.jumlahBiaya)}</span>
              </span>
              <span>Diterima: {formatTanggal(p.updatedAt)}</span>
              {p.buktiTransferUrl && (
                <a
                  href={p.buktiTransferUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-event-blue hover:underline"
                >
                  <FileText size={12} /> Lihat bukti transfer
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                isLoading={processing === p.id}
                onClick={() => aksi(p.id, 'LUNAS')}
                disabled={tolakId === p.id}
                className="flex-1"
              >
                <Check size={14} /> Lunas
              </Button>
              <Button
                size="sm"
                variant="danger"
                isLoading={processing === p.id}
                onClick={() => aksi(p.id, 'DITOLAK')}
                className="flex-1"
              >
                <X size={14} /> Tolak
              </Button>
            </div>
            {tolakId === p.id && (
              <div className="flex flex-col gap-2 border-3 border-pmi-red bg-pmi-red/10 p-3">
                <p className="font-body text-[11px] font-bold text-pmi-red">
                  Alasan penolakan (opsional)
                </p>
                <textarea
                  value={catatanTolak}
                  onChange={(e) => setCatatanTolak(e.target.value)}
                  rows={2}
                  placeholder="Contoh: bukti transfer buram / nominal tidak sesuai"
                  className="font-body text-xs px-3 py-2 border-2 border-event-navy/30 focus:border-pmi-red focus:outline-none resize-none bg-white"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={processing === p.id}
                    onClick={() => konfirmasiTolak(p.id)}
                    className="flex-1"
                  >
                    Konfirmasi Tolak
                  </Button>
                  <Button size="sm" variant="outline" onClick={batalTolak} disabled={processing === p.id} className="flex-1">
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}