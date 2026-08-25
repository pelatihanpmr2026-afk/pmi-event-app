'use client'

import { useState, useEffect } from 'react'

interface SewaRow {
  id: string
  namaSekolah: string
  kodePendaftaran: string
  tenda: { nama: string; jumlah: number }[]
  totalUnit: number
  totalBiaya: number
  tanggalSewa: string | null
}

function rp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

export function TendaSewaList() {
  const [data, setData] = useState<SewaRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/tenda/sewa-list')
        const result = await res.json()
        if (result.success) setData(result.data)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return <p className="font-body text-sm text-event-navy/50 text-center py-8">Memuat data...</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-xs text-event-navy">SEKOLAH YANG SEWA TENDA (SUDAH LUNAS)</h2>

      {data.length === 0 ? (
        <div className="border-3 border-event-navy bg-white py-10 text-center">
          <p className="font-body text-sm text-event-navy/50">Belum ada sekolah yang sewa tenda</p>
        </div>
      ) : (
        <div className="border-3 border-event-navy overflow-x-auto bg-white">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-event-navy text-white">
                <th className="font-body text-xs px-3 py-3 text-left">Nama Sekolah</th>
                <th className="font-body text-xs px-3 py-3 text-left">Detail Tenda</th>
                <th className="font-body text-xs px-3 py-3 text-center">Total Unit</th>
                <th className="font-body text-xs px-3 py-3 text-right">Total Biaya</th>
                <th className="font-body text-xs px-3 py-3 text-left">Tgl Konfirmasi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s, i) => (
                <tr key={s.id} className={`border-t-2 border-event-navy/10 ${i % 2 === 1 ? 'bg-event-cream/40' : ''}`}>
                  <td className="px-3 py-2.5 font-body text-sm font-bold text-event-navy">
                    {s.namaSekolah}
                    <span className="block font-body text-[10px] text-event-navy/50 font-normal">{s.kodePendaftaran}</span>
                  </td>
                  <td className="px-3 py-2.5 font-body text-xs text-event-navy">
                    {s.tenda.map((t) => `${t.nama} (${t.jumlah})`).join(', ')}
                  </td>
                  <td className="px-3 py-2.5 text-center font-body text-xs text-event-navy">{s.totalUnit}</td>
                  <td className="px-3 py-2.5 text-right font-body text-xs font-bold text-event-navy">{rp(s.totalBiaya)}</td>
                  <td className="px-3 py-2.5 font-body text-xs text-event-navy">
                    {s.tanggalSewa
                      ? new Date(s.tanggalSewa).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}