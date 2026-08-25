'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DownloadPengajuanButton({ pengajuanId }: { pengajuanId: string }) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownload() {
    if (isDownloading) return
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/pengajuan-anggaran/${pengajuanId}/pdf`, { method: 'POST' })
      if (!res.ok) {
        const result = await res.json().catch(() => null)
        throw new Error(result?.message || 'Gagal membuat PDF')
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] || 'pengajuan-anggaran.pdf'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      variant="secondary"
      className="flex items-center gap-2"
      onClick={handleDownload}
      isLoading={isDownloading}
      disabled={isDownloading}
    >
      <Download size={16} />
      {isDownloading ? 'Membuat PDF...' : 'Download PDF Pengajuan'}
    </Button>
  )
}