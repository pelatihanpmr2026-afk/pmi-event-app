'use client'

import { useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QrScanner } from './qr-scanner'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

export function ScannerPanel() {
  const [isScanning, setIsScanning] = useState(false)

  // Scan result logic untuk panel ini khusus meneruskan ke parent
  const handleScan = (decodedText: string) => {
    // Logic untuk melemparkan hasil scan ke parent akan ditangani oleh parent yang membungkus komponen ini
    // Namun di Dashboard Absensi, logic ini langsung di handle di handleScan di QRScanner
    // Kita biarkan QRScanner yang handle
  }

  return (
    <Card>
      <CardHeader variant="blue">
        <h2 className="font-heading text-xs text-white">SCAN QR ABSENSI</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <QrScanner onScan={(text) => {
          // Logic handle scan di parent
        }} isProcessing={false} />
      </CardContent>
    </Card>
  )
}