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
  const [semuaTanggal, setSemuaTanggal] = useState(false)
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

  const paramTanggal = semuaTanggal ? 'all' : tanggal

  async function handleLihat() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/pendaftaran/rekap-harian?tanggal=${paramTanggal}`)
      const result = await res.json()
      if (result.success) setData(result.data)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDownload(format: 'excel' | 'pdf') {
    window.open(`/api/pendaftaran/rekap-harian/download?tanggal=${paramTanggal}&format=${format}`, '_blank')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <Input label="Pilih Tanggal" type="date" value={tanggal} disabled={semuaTanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <label className="flex items-center gap-2 h-11 px-3 border-3 border-event-navy bg-white cursor-pointer select-none">
            <input type="checkbox" checked={semuaTanggal} onChange={(e) => setSemuaTanggal(e.target.checked)} className="accent-event-navy" />
            <span className="font-body text-xs text-event-navy">Semua Tanggal</span>
          </label>
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
      </div>

      {data && (
        <>
          <p className="font-body font-bold text-xs text-event-navy/70">Rekap Pendaftaran</p>

          {/* MOBILE: Card */}
          <div className="md:hidden flex flex-col gap-3">
            {data.pendaftaran.length === 0 && (
              <div className="border-3 border-event-navy bg-white py-8 text-center">
                <p className="font-body text-sm text-event-navy/50">Tidak ada pendaftaran di tanggal ini</p>
              </div>
            )}
            {data.pendaftaran.map((r, i) => (
              <div key={i} className="border-3 border-event-navy bg-white p-3 flex flex-col gap-2">
                <p className="font-body font-bold text-sm text-event-navy">{r.namaSekolah}</p>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-body">
                  <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                    <span className="text-event-navy/50 block">Peserta</span>
                    <span className="text-event-navy font-bold block">{r.jumlahPeserta}</span>
                  </div>
                  <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                    <span className="text-event-navy/50 block">Pendamping</span>
                    <span className="text-event-navy font-bold block">{r.jumlahPendamping}</span>
                  </div>
                  <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                    <span className="text-event-navy/50 block">Total</span>
                    <span className="text-event-navy font-bold block">{rp(r.totalRp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: Table */}
          <div className="hidden md:block border-3 border-event-navy overflow-x-auto bg-white">
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

              {/* MOBILE: Card */}
              <div className="md:hidden flex flex-col gap-3">
                {data.tenda.map((r, i) => (
                  <div key={i} className="border-3 border-event-navy bg-white p-3 flex flex-col gap-2">
                    <p className="font-body font-bold text-sm text-event-navy">{r.namaSekolah}</p>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-body">
                      <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20 col-span-1">
                        <span className="text-event-navy/50 block">Tenda</span>
                        <span className="text-event-navy font-bold block truncate">{r.namaTenda}</span>
                      </div>
                      <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                        <span className="text-event-navy/50 block">Qty</span>
                        <span className="text-event-navy font-bold block">{r.jumlahTenda}</span>
                      </div>
                      <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                        <span className="text-event-navy/50 block">Total</span>
                        <span className="text-event-navy font-bold block">{rp(r.totalRp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP: Table */}
              <div className="hidden md:block border-3 border-event-navy overflow-x-auto bg-white">
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

          <div className="border-3 border-event-navy bg-event-yellow/20 p-4 flex flex-col gap-1 sm:max-w-sm sm:ml-auto">
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span>Total Pendaftaran</span>
              <span className="font-bold">{rp(data.totalPendaftaran)}</span>
            </div>
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span>Total Sewa Tenda</span>
              <span className="font-bold">{rp(data.totalSewaTenda)}</span>
            </div>
            <div className="flex justify-between font-body font-bold text-sm text-event-navy pt-1.5 border-t-2 border-event-navy/20">
              <span>TOTAL</span>
              <span>{rp(data.totalKeseluruhan)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}