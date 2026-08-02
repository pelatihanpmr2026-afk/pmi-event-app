'use client'

import Image from 'next/image'
import { CheckCircle2, XCircle } from 'lucide-react'
import { DIVISI_OPTIONS } from '@/lib/constants'

export interface ScanResult {
  success: boolean
  message: string
  data?: {
    nama: string
    divisi: string
    fotoUrl: string
    sesi: string
  }
}

function findLabel(value: string) {
  return DIVISI_OPTIONS.find((d) => d.value === value)?.label ?? value
}

export function ScanResultCard({ result }: { result: ScanResult | null }) {
  if (!result) {
    return (
      <div className="border-3 border-dashed border-event-navy/30 p-6 text-center">
        <p className="font-body text-xs text-event-navy/50">
          Arahkan kamera ke QR Code panitia untuk mulai absen
        </p>
      </div>
    )
  }

  return (
    <div
      className={`border-3 border-event-navy p-4 flex items-center gap-4 animate-pixel-pop ${
        result.success ? 'bg-green-100' : 'bg-pmi-red/10'
      }`}
    >
      {result.success ? (
        <CheckCircle2 size={32} className="text-green-600 shrink-0" />
      ) : (
        <XCircle size={32} className="text-pmi-red shrink-0" />
      )}

      <div className="flex items-center gap-3 min-w-0 flex-1">
        {result.data?.fotoUrl && (
          <div className="relative w-12 h-12 border-2 border-event-navy shrink-0 overflow-hidden">
            <Image src={result.data.fotoUrl} alt={result.data.nama} fill className="object-cover" />
          </div>
        )}
        <div className="min-w-0">
          {result.data && (
            <p className="font-body font-bold text-sm text-event-navy truncate">
              {result.data.nama} — {findLabel(result.data.divisi)}
            </p>
          )}
          <p className="font-body text-xs text-event-navy/70">{result.message}</p>
        </div>
      </div>
    </div>
  )
}