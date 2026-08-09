'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface DaftarUlangResult {
  success: boolean
  message: string
  data?: {
    namaLengkap: string
    kodePendaftaran: string
    kategori: string
    jumlahPeserta: number
    jumlahPendamping: number
  }
}

export function DaftarUlangResultCard({ result }: { result: DaftarUlangResult | null }) {
  if (!result) {
    return (
      <div className="border-3 border-dashed border-event-navy/30 p-6 text-center">
        <p className="font-body text-xs text-event-navy/50">
          Arahkan kamera ke QR Code pada kwitansi peserta sekolah
        </p>
      </div>
    )
  }

  return (
    <div
      className={`border-3 border-event-navy p-4 flex items-start gap-3 animate-pixel-pop ${
        result.success ? 'bg-green-100' : 'bg-pmi-red/10'
      }`}
    >
      {result.success ? (
        <CheckCircle2 size={28} className="text-green-600 shrink-0 mt-0.5" />
      ) : (
        <XCircle size={28} className="text-pmi-red shrink-0 mt-0.5" />
      )}

      <div className="min-w-0 flex-1">
        {result.data && (
          <>
            <p className="font-body font-bold text-sm text-event-navy">{result.data.namaLengkap}</p>
            <p className="font-body text-xs text-event-navy/60 mb-1.5">{result.data.kodePendaftaran}</p>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <Badge variant="default">{result.data.kategori}</Badge>
              <span className="font-body text-[11px] text-event-navy/60">
                {result.data.jumlahPeserta} peserta · {result.data.jumlahPendamping} pendamping
              </span>
            </div>
          </>
        )}
        <p className="font-body text-xs text-event-navy">{result.message}</p>
      </div>
    </div>
  )
}