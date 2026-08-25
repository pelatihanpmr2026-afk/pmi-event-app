'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Receipt } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import type { MismatchItem } from '@/lib/rekonsiliasi'

const TIPE_LABEL: Record<MismatchItem['tipe'], string> = { PESERTA: 'Peserta', TENDA: 'Tenda' }

function formatRp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function RekonsiliasiPanel() {
  const [mismatches, setMismatches] = useState<MismatchItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/keuangan/rekonsiliasi')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setMismatches(result.data)
        else setError(true)
      })
      .catch(() => setError(true))
  }, [])

  if (error) return null

  if (mismatches === null) {
    return (
      <Card>
        <CardContent className="p-4 text-sm font-body text-event-navy/60">
          Memeriksa konsistensi pembayaran…
        </CardContent>
      </Card>
    )
  }

  if (mismatches.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <p className="font-body text-xs text-event-navy">
            Semua pembayaran sesuai dengan jumlah biaya terhitung.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader variant="yellow">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-pmi-red" />
          <h3 className="font-heading text-[10px] text-event-navy">
            REKONSILIASI: {mismatches.length} PEMBAYARAN TIDAK KONSISTEN
          </h3>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {mismatches.map((m) => (
          <div key={m.pembayaranId} className="flex flex-col gap-0.5 border border-pmi-red/40 bg-pmi-red/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-xs font-bold text-event-navy">{m.namaSekolah}</span>
              <span className="font-body text-[10px] text-event-navy/50">
                {TIPE_LABEL[m.tipe]} · Batch {m.batchKe}
              </span>
            </div>
            <p className="font-body text-[11px] text-event-navy/70">
              Tersimpan {formatRp(m.jumlahBiaya)} vs terhitung {formatRp(m.jumlahSeharusnya)}{' '}
              <span className="font-bold text-pmi-red">(selisih {formatRp(m.selisih)})</span>
            </p>
          </div>
        ))}
        <p className="font-body text-[10px] text-event-navy/50 flex items-center gap-1">
          <Receipt size={11} /> Selisih bisa muncul jika jumlah peserta/order tenda diubah di luar alur pendaftaran.
        </p>
      </CardContent>
    </Card>
  )
}