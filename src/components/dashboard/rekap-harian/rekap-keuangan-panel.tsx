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
  const [data, setData] = useState<{ transaksi: TransaksiRow[]; totalDebit: number; totalKredit: number; totalUtang: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLihat() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/keuangan/rekap-harian?tanggal=${tanggal}`)
      const result = await res.json()
      if (result.success) setData(result.data)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDownload(format: 'excel' | 'pdf') {
    window.open(`/api/keuangan/rekap-harian/download?tanggal=${tanggal}&format=${format}`, '_blank')
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
          <div className="border-3 border-event-navy overflow-x-auto bg-white">
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