'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { QrScanner } from '@/components/dashboard/absensi/qr-scanner'
import { DaftarUlangResultCard, type DaftarUlangResult } from './scan-result-card'

export function DaftarUlangScannerPanel() {
  const [result, setResult] = useState<DaftarUlangResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  async function handleScan(qrToken: string) {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      const res = await fetch('/api/sekolah/daftar-ulang/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken }),
      })
      const data = await res.json()
      setResult({ success: res.ok && data.success, message: data.message, data: data.data })
    } catch {
      setResult({ success: false, message: 'Gagal menghubungi server' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader variant="pink">
        <h2 className="font-heading text-xs text-white">SCAN QR KWITANSI PESERTA</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <QrScanner onScan={handleScan} isProcessing={isProcessing} />
        <DaftarUlangResultCard result={result} onClose={() => setResult(null)} />
      </CardContent>
    </Card>
  )
}
