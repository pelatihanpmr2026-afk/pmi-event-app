'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface TransaksiRow { id: string; keterangan: string; uraian: string; debit: number; kredit: number; utang: number }

function rp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function RekapKeuanganPanel() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10))
  const [semuaTanggal, setSemuaTanggal] = useState(false)
  const [data, setData] = useState<{ transaksi: TransaksiRow[]; totalDebit: number; totalKredit: number; totalUtang: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const paramTanggal = semuaTanggal ? 'all' : tanggal

  async function handleLihat() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/keuangan/rekap-harian?tanggal=${paramTanggal}`)
      const result = await res.json()
      if (result.success) setData(result.data)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDownload(format: 'excel' | 'pdf') {
    window.open(`/api/keuangan/rekap-harian/download?tanggal=${paramTanggal}&format=${format}`, '_blank')
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
            {data.transaksi.length === 0 && (
              <div className="border-3 border-event-navy bg-white py-8 text-center">
                <p className="font-body text-sm text-event-navy/50">Tidak ada transaksi di tanggal ini</p>
              </div>
            )}
            {data.transaksi.map((t) => (
              <div key={t.id} className="border-3 border-event-navy bg-white p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-body font-bold text-xs text-event-navy flex-1">{t.keterangan}</p>
                  <span className="font-body text-[10px] text-event-navy/50 shrink-0">{t.uraian}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-body">
                  <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                    <span className="text-event-navy/50 block">Debit</span>
                    <span className="text-event-navy font-bold block">{t.debit ? rp(t.debit) : '-'}</span>
                  </div>
                  <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                    <span className="text-event-navy/50 block">Kredit</span>
                    <span className="text-event-navy font-bold block">{t.kredit ? rp(t.kredit) : '-'}</span>
                  </div>
                  <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                    <span className="text-event-navy/50 block">Utang</span>
                    <span className="text-event-navy font-bold block">{t.utang ? rp(t.utang) : '-'}</span>
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
                  <th className="font-body text-xs px-3 py-3 text-left">Keterangan</th>
                  <th className="font-body text-xs px-3 py-3 text-left">Uraian</th>
                  <th className="font-body text-xs px-3 py-3 text-right">Debit</th>
                  <th className="font-body text-xs px-3 py-3 text-right">Kredit</th>
                  <th className="font-body text-xs px-3 py-3 text-right">Utang</th>
                </tr>
              </thead>
              <tbody>
                {data.transaksi.map((t, i) => (
                  <tr key={t.id} className={`border-t-2 border-event-navy/10 ${i % 2 === 1 ? 'bg-event-cream/40' : ''}`}>
                    <td className="px-3 py-2.5 font-body text-xs text-event-navy">{t.keterangan}</td>
                    <td className="px-3 py-2.5 font-body text-xs font-bold text-event-navy">{t.uraian}</td>
                    <td className="px-3 py-2.5 text-right font-body text-xs text-event-navy">{t.debit ? rp(t.debit) : '-'}</td>
                    <td className="px-3 py-2.5 text-right font-body text-xs text-event-navy">{t.kredit ? rp(t.kredit) : '-'}</td>
                    <td className="px-3 py-2.5 text-right font-body text-xs text-event-navy">{t.utang ? rp(t.utang) : '-'}</td>
                  </tr>
                ))}
                {data.transaksi.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 font-body text-sm text-event-navy/50">
                      Tidak ada transaksi di tanggal ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-3 border-event-navy bg-event-yellow/20 p-4 flex flex-col gap-1">
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span>Total Debit</span>
              <span className="font-bold">{rp(data.totalDebit)}</span>
            </div>
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span>Total Kredit</span>
              <span className="font-bold">{rp(data.totalKredit)}</span>
            </div>
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span>Total Utang</span>
              <span className="font-bold">{rp(data.totalUtang)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}