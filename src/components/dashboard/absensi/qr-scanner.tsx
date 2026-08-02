'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QrScannerProps {
  onScan: (decodedText: string) => void
  isProcessing: boolean
}

export function QrScanner({ onScan, isProcessing }: QrScannerProps) {
  const containerId = 'qr-scanner-container'
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastScanRef = useRef<{ text: string; time: number }>({ text: '', time: 0 })

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  async function startScanner() {
    setError(null)
    try {
      const scanner = new Html5Qrcode(containerId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const now = Date.now()
          // Debounce: cegah 1 QR yang sama ke-trigger berkali-kali dalam 3 detik
          if (decodedText === lastScanRef.current.text && now - lastScanRef.current.time < 3000) {
            return
          }
          lastScanRef.current = { text: decodedText, time: now }
          onScan(decodedText)
        },
        () => {
          // Diamkan error per-frame (normal terjadi terus saat kamera belum menemukan QR)
        }
      )

      setIsActive(true)
    } catch {
      setError('Gagal mengakses kamera. Pastikan browser diizinkan akses kamera.')
    }
  }

  async function stopScanner() {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop()
    }
    setIsActive(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        id={containerId}
        className="w-full max-w-sm mx-auto border-3 border-event-navy shadow-pixel-lg overflow-hidden bg-black aspect-square [&>video]:object-cover"
      />

      {error && <p className="font-body text-xs font-bold text-pmi-red text-center">{error}</p>}

      <div className="flex justify-center">
        {!isActive ? (
          <Button
            variant="primary"
            onClick={startScanner}
            className="flex items-center gap-2"
            disabled={isProcessing}
          >
            <Camera size={16} />
            Mulai Scan
          </Button>
        ) : (
          <Button
            variant="danger"
            onClick={stopScanner}
            className="flex items-center gap-2"
          >
            <CameraOff size={16} />
            Hentikan Kamera
          </Button>
        )}
      </div>
    </div>
  )
}