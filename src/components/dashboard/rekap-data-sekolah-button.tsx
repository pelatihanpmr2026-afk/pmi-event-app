'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RekapDataSekolahButton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        onClick={() => window.open('/api/sekolah/rekap-data/download?kategori=WIRA', '_blank')}
        className="flex items-center gap-1.5"
      >
        <Download size={14} />
        Rekap Wira (PDF)
      </Button>
      <Button
        variant="secondary"
        onClick={() => window.open('/api/sekolah/rekap-data/download?kategori=MADYA', '_blank')}
        className="flex items-center gap-1.5"
      >
        <Download size={14} />
        Rekap Madya (PDF)
      </Button>
      <span className="text-gray-300">|</span>
      <Button
        variant="primary"
        onClick={() => window.open('/api/sekolah/pembina/download?kategori=WIRA', '_blank')}
        className="flex items-center gap-1.5"
      >
        <Download size={14} />
        Pembina Wira
      </Button>
      <Button
        variant="primary"
        onClick={() => window.open('/api/sekolah/pembina/download?kategori=MADYA', '_blank')}
        className="flex items-center gap-1.5"
      >
        <Download size={14} />
        Pembina Madya
      </Button>
    </div>
  )
}