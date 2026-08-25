'use client'

import { useState } from 'react'
import { ShieldCheck, Building2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SekolahItem {
  sekolahId: string
  namaLengkap: string
  kodePendaftaran: string
  kategori: string
  batchTerakhir: number
  statusBatchTerakhir: string | null
}

interface VerifikasiSekolahFormProps {
  title: string
  description: string
  /** Endpoint verifikasi, misal `/api/sekolah/${sekolahId}/pembayaran/verify` */
  endpoint: string
  /** `GET` memakai query params, selain itu JSON body POST */
  method?: 'GET' | 'POST'
  /** Dipanggil saat multi sekolah untuk menerbitkan sesi sekolah terpilih */
  selectEndpoint?: string
  /** Dikirim dalam body POST bila alur sudah tahu sekolah terpilih (alur tenda) */
  sekolahId?: string
  buttonLabel?: string
  onSuccess: (data: Record<string, unknown>) => void
  onCancel?: () => void
}

/**
 * Form verifikasi kepemilikan sekolah memakai No. WhatsApp pembina/pelatih
 * yang terdaftar. Satu nomor bisa terdaftar di beberapa sekolah — bila API
 * mengembalikan `multi: true`, form menampilkan daftar sekolah untuk dipilih
 * (kemudian memanggil `selectEndpoint` untuk menerbitkan sesi).
 */
export function VerifikasiSekolahForm({
  title,
  description,
  endpoint,
  method = 'POST',
  selectEndpoint,
  sekolahId,
  buttonLabel = 'Verifikasi & Lanjutkan',
  onSuccess,
  onCancel,
}: VerifikasiSekolahFormProps) {
  const [noWa, setNoWa] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sekolahList, setSekolahList] = useState<SekolahItem[] | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSekolahList(null)

    if (!noWa.trim()) {
      setError('No. WhatsApp wajib diisi')
      return
    }

    setIsSubmitting(true)
    try {
      const res =
        method === 'GET'
          ? await fetch(`${endpoint}?${new URLSearchParams({ noWa: noWa.trim() }).toString()}`)
          : await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sekolahId ? { sekolahId, noWa: noWa.trim() } : { noWa: noWa.trim() }),
            })

      const result = await res.json()

      if (!res.ok || !result.success) {
        setError(result?.message || 'No. WhatsApp tidak terdaftar di sistem')
        return
      }

      if (result.multi) {
        setSekolahList(result.data?.sekolah ?? [])
        return
      }

      onSuccess(result.data ?? {})
    } catch {
      setError('Terjadi kesalahan, silakan coba lagi')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function pilihSekolah(sekolah: SekolahItem) {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(selectEndpoint ?? endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sekolahId: sekolah.sekolahId, noWa: noWa.trim() }),
      })
      const result = await res.json()

      if (!res.ok || !result.success) {
        setError(result?.message || 'Gagal memilih sekolah')
        return
      }

      onSuccess(result.data ?? {})
    } catch {
      setError('Terjadi kesalahan, silakan coba lagi')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader variant="blue">
        <h2 className="font-heading text-xs sm:text-sm flex items-center gap-2">
          <ShieldCheck size={16} />
          {title.toUpperCase()}
        </h2>
      </CardHeader>
      <CardContent>
        {sekolahList === null ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="font-body text-xs text-event-navy/60">{description}</p>

            <Input
              label="No. WhatsApp Pembina/Pelatih (yang terdaftar)"
              placeholder="Contoh: 081234567890"
              inputMode="tel"
              value={noWa}
              onChange={(e) => setNoWa(e.target.value)}
            />

            {error && (
              <div className="border-3 border-pmi-red bg-pmi-red/10 p-3">
                <p className="font-body text-xs text-event-navy">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Kembali
                </Button>
              )}
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="flex-1">
                {buttonLabel}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-body text-xs text-event-navy/60">
              Nomor ini terdaftar untuk {sekolahList.length} sekolah. Pilih sekolah yang ingin
              dilanjutkan:
            </p>

            {error && (
              <div className="border-3 border-pmi-red bg-pmi-red/10 p-3">
                <p className="font-body text-xs text-event-navy">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {sekolahList.map((s) => (
                <button
                  key={s.sekolahId}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void pilihSekolah(s)}
                  className="text-left border-3 border-event-navy bg-white shadow-pixel-sm p-3 transition-all hover:bg-event-cream hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel disabled:opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-event-navy/60 shrink-0" />
                    <span className="font-body font-bold text-sm text-event-navy">{s.namaLengkap}</span>
                  </div>
                  <p className="font-body text-[11px] text-event-navy/60 mt-1">
                    {s.kategori} · Batch terakhir: {s.batchTerakhir}
                    {s.statusBatchTerakhir ? ` (${s.statusBatchTerakhir})` : ''}
                  </p>
                </button>
              ))}
            </div>

            {onCancel && (
              <Button type="button" variant="outline" onClick={() => setSekolahList(null)} disabled={isSubmitting}>
                Ubah No. WhatsApp
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}