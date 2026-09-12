'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RekapDataSekolahButton() {
  return (
    <Button variant="secondary" onClick={() => window.open('/api/sekolah/rekap-data/download', '_blank')} className="flex items-center gap-1.5">
      <Download size={14} />
      Rekap Data Sekolah (PDF)
    </Button>
  )
}