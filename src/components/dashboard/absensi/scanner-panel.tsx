'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QrScanner } from './qr-scanner'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

interface ScanResult {
  success: boolean
  message: string
  data?: {
    nama: string
    divisi: string
    sesi: string
  }
}

export function ScannerPanel() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)

  async function handleScan(qrToken: string) {
    if (isProcessing) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/absensi/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken }),
      })
      const data = await response.json()

      setResult({
        success: response.ok && data.success,
        message: data.message || 'Tidak ada respons dari server',
        data: data.data,
      })
    } catch {
      setResult({ success: false, message: 'Gagal menghubungi server' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader variant="blue">
        <h2 className="font-heading text-xs text-white">SCAN QR ABSENSI</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <QrScanner onScan={handleScan} isProcessing={isProcessing} />

        <div
          aria-live="polite"
          className={`rounded-[var(--radius-card)] border p-4 flex items-start gap-3 ${
            result?.success
              ? 'border-green-600 bg-green-50'
              : result
                ? 'border-pmi-red bg-red-50'
                : 'border-[var(--color-border)] bg-[var(--color-surface-muted)]'
          }`}
        >
          {result?.success ? (
            <CheckCircle2 size={24} className="text-green-600 shrink-0" />
          ) : result ? (
            <XCircle size={24} className="text-pmi-red shrink-0" />
          ) : null}
          <div className="font-body text-sm">
            {!result ? (
              <p className="text-gray-400">Arahkan kamera ke QR Code panitia.</p>
            ) : (
              <>
                <p className={result.success ? 'text-green-700' : 'text-pmi-red'}>{result.message}</p>
                {result.data && (
                  <p className="text-event-navy mt-1">
                    {result.data.nama} · {result.data.divisi} · Sesi: {result.data.sesi}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
