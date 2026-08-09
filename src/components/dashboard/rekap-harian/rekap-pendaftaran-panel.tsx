'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface PendaftaranRow { namaSekolah: string; jumlahPeserta: number; jumlahPendamping: number; totalRp: number }
interface TendaRow { namaSekolah: string; namaTenda: string; jumlahTenda: number; totalRp: number }

function rp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function RekapPendaftaranPanel() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<{
    pendaftaran: PendaftaranRow[]
    tenda: TendaRow[]
    totalJumlahPeserta: number
    totalJumlahPendamping: number
    totalJumlahTenda: number
    totalPendaftaran: number
    totalSewaTenda: number
    totalKeseluruhan: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLihat() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/pendaftaran/rekap-harian?tanggal=${tanggal}`)
      const result = await res.json()
      if (result.success) setData(result.data)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDownload(format: 'excel' | 'pdf') {
    window.open(`/api/pendaftaran/rekap-harian/download?tanggal=${tanggal}&format=${format}`, '_blank')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <Input label="Pilih Tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <Button variant="primary" onClick={handleLihat} isLoading={isLoading}>
          Lihat
        </Button>
        <Button variant="secondary" onClick={() => handleDownload('excel')} className="flex items-center gap-1.5">
          <Download size={14} />
          Excel
        </Button>
        <Button variant="outline" onClick={() => handleDownload('pdf')} className="flex items-center gap-1.5">
          <Download size={14} />
          PDF
        </Button>
      </div>

      {data && (
        <>
          <p className="font-body font-bold text-xs text-event-navy/70">Rekap Pendaftaran</p>
          <div className="border-3 border-event-navy overflow-x-auto bg-white">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-event-navy text-white">
                  <th className="font-body text-xs px-3 py-3 text-left">Nama Sekolah</th>
                  <th className="font-body text-xs px-3 py-3 text-center">Jumlah Peserta</th>
                  <th className="font-body text-xs px-3 py-3 text-center">Jumlah Pendamping</th>
                  <th className="font-body text-xs px-3 py-3 text-right">Total (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {data.pendaftaran.map((r, i) => (
                  <tr key={i} className={`border-t-2 border-event-navy/10 ${i % 2 === 1 ? 'bg-event-cream/40' : ''}`}>
                    <td className="px-3 py-2.5 font-body text-sm font-bold text-event-navy">{r.namaSekolah}</td>
                    <td className="px-3 py-2.5 text-center font-body text-xs text-event-navy">{r.jumlahPeserta}</td>
                    <td className="px-3 py-2.5 text-center font-body text-xs text-event-navy">{r.jumlahPendamping}</td>
                    <td className="px-3 py-2.5 text-right font-body text-xs font-bold text-event-navy">{rp(r.totalRp)}</td>
                  </tr>
                ))}
                {data.pendaftaran.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 font-body text-sm text-event-navy/50">
                      Tidak ada pendaftaran di tanggal ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data.tenda.length > 0 && (
            <>
              <p className="font-body font-bold text-xs text-event-navy/70">Rekap Sewa Tenda</p>
              <div className="border-3 border-event-navy overflow-x-auto bg-white">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-event-pink text-white">
                      <th className="font-body text-xs px-3 py-3 text-left">Nama Sekolah</th>
                      <th className="font-body text-xs px-3 py-3 text-left">Nama Tenda</th>
                      <th className="font-body text-xs px-3 py-3 text-center">Qty</th>
                      <th className="font-body text-xs px-3 py-3 text-right">Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tenda.map((r, i) => (
                      <tr key={i} className={`border-t-2 border-event-navy/10 ${i % 2 === 1 ? 'bg-event-cream/40' : ''}`}>
                        <td className="px-3 py-2.5 font-body text-sm font-bold text-event-navy">{r.namaSekolah}</td>
                        <td className="px-3 py-2.5 font-body text-xs text-event-navy">{r.namaTenda}</td>
                        <td className="px-3 py-2.5 text-center font-body text-xs text-event-navy">{r.jumlahTenda}</td>
                        <td className="px-3 py-2.5 text-right font-body text-xs font-bold text-event-navy">{rp(r.totalRp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="border-3 border-event-navy bg-event-yellow/20 p-4 flex flex-col gap-1 max-w-sm ml-auto">
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span>Total Pendaftaran</span>
              <span className="font-bold">{rp(data.totalPendaftaran)}</span>
            </div>
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span>Total Sewa Tenda</span>
              <span className="font-bold">{rp(data.totalSewaTenda)}</span>
            </div>
            <div className="flex justify-between font-heading text-xs text-event-navy pt-1.5 border-t-2 border-event-navy/20">
              <span>TOTAL</span>
              <span>{rp(data.totalKeseluruhan)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}