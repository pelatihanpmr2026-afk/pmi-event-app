'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface TendaRow {
  no: number
  namaSekolah: string
  kodePendaftaran: string
  tenda: { nama: string; jumlah: number }[]
  totalUnit: number
  totalRp: number
}

function rp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function RekapTendaPanel() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10))
  const [semuaTanggal, setSemuaTanggal] = useState(false)
  const [data, setData] = useState<{ rows: TendaRow[]; totalUnit: number; totalRp: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const paramTanggal = semuaTanggal ? 'all' : tanggal

  async function handleLihat() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/tenda/rekap-harian?tanggal=${paramTanggal}`)
      const result = await res.json()
      if (result.success) setData(result.data)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDownload(format: 'excel' | 'pdf') {
    window.open(`/api/tenda/rekap-harian/download?tanggal=${paramTanggal}&format=${format}`, '_blank')
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
          {/* MOBILE: Card */}
          <div className="md:hidden flex flex-col gap-3">
            {data.rows.length === 0 && (
              <div className="border-3 border-event-navy bg-white py-8 text-center">
                <p className="font-body text-sm text-event-navy/50">Tidak ada sewa tenda di tanggal ini</p>
              </div>
            )}
            {data.rows.map((r) => (
              <div key={r.no} className="border-3 border-event-navy bg-white p-3 flex flex-col gap-2">
                <p className="font-body text-[11px] text-event-navy/50">
                  {r.no}. {r.kodePendaftaran}
                </p>
                <p className="font-body font-bold text-sm text-event-navy">{r.namaSekolah}</p>
                <div className="flex flex-col gap-1.5">
                  {r.tenda.map((t, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center font-body text-xs text-event-navy bg-event-cream px-2 py-1.5 border border-event-navy/20"
                    >
                      <span>{t.nama}</span>
                      <span className="font-bold">{t.jumlah} unit</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-body text-xs text-event-navy">
                  <span className="text-event-navy/50">Jumlah Tenda</span>
                  <span className="font-bold">{r.totalUnit} unit</span>
                </div>
                <div className="flex justify-between font-body text-xs text-event-navy">
                  <span className="text-event-navy/50">Total</span>
                  <span className="font-bold">{rp(r.totalRp)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: Table */}
          <div className="hidden md:block border-3 border-event-navy overflow-x-auto bg-white">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-event-navy text-white">
                  <th className="font-body text-xs px-3 py-3 text-center w-14">No</th>
                  <th className="font-body text-xs px-3 py-3 text-left">Nama Sekolah</th>
                  <th className="font-body text-xs px-3 py-3 text-left">Tenda yang Disewa</th>
                  <th className="font-body text-xs px-3 py-3 text-center">Jumlah Tenda</th>
                  <th className="font-body text-xs px-3 py-3 text-right">Total (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr
                    key={r.no}
                    className={`border-t-2 border-event-navy/10 ${i % 2 === 1 ? 'bg-event-cream/40' : ''}`}
                  >
                    <td className="px-3 py-2.5 text-center font-body text-xs text-event-navy">{r.no}</td>
                    <td className="px-3 py-2.5 font-body text-sm font-bold text-event-navy">
                      {r.namaSekolah}
                      <span className="block font-body text-[10px] text-event-navy/50 font-normal">
                        {r.kodePendaftaran}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-body text-xs text-event-navy">
                      <div className="flex flex-col gap-0.5">
                        {r.tenda.map((t, ti) => (
                          <div key={ti} className="flex items-center gap-2">
                            <span>{t.nama}</span>
                            <span className="font-bold">x {t.jumlah}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-body text-xs font-bold text-event-navy">
                      {r.totalUnit}
                    </td>
                    <td className="px-3 py-2.5 text-right font-body text-xs font-bold text-event-navy">
                      {rp(r.totalRp)}
                    </td>
                  </tr>
                ))}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 font-body text-sm text-event-navy/50">
                      Tidak ada sewa tenda di tanggal ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data.rows.length > 0 && (
            <div className="border-3 border-event-navy bg-event-yellow/20 p-4 flex flex-col gap-1 sm:max-w-sm sm:ml-auto">
              <div className="flex justify-between font-body text-xs text-event-navy">
                <span>Jumlah Tenda</span>
                <span className="font-bold">{data.totalUnit} unit</span>
              </div>
              <div className="flex justify-between font-body font-bold text-sm text-event-navy pt-1.5 border-t-2 border-event-navy/20">
                <span>TOTAL</span>
                <span>{rp(data.totalRp)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}