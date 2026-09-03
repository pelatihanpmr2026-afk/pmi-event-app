'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Tent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import type { DataSekolahMiniValues } from '@/lib/validations/sekolah'
import { TENDA_TOLERANSI } from '@/lib/constants-sekolah'

interface TendaData { id: string; nama: string; gambarUrl: string | null; kapasitasMin: number; kapasitasMax: number; harga: number; stokTersisa: number }
interface KapasitasInfo {
  namaLengkap: string; kodePendaftaran: string; jumlahAktual: number; estimasi: number; efektifJumlahOrang: number
  batasKapasitas: number; terkunci: boolean; reservasiAktif: boolean; reservasiBerakhirPada: string | null
  pilihanSaatIni: { tendaJenisId: string; jumlah: number }[]
}

export function PemilihanTenda({ sekolahId, draftSekolah, onSuccess }: { sekolahId?: string; draftSekolah?: DataSekolahMiniValues; onSuccess: (hasReservation: boolean, pilihan?: { tendaJenisId: string; jumlah: number }[]) => void }) {
  const [tendaList, setTendaList] = useState<TendaData[]>([])
  const [kapasitas, setKapasitas] = useState<KapasitasInfo | null>(null)
  const [selection, setSelection] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Menjaga agar effect penyimpanan TIDAK menimpa/hapus data yang tersimpan
  // sebelum proses pemulihan (restore) selesai. Tanpa ini, refresh halaman
  // menghapus pilihan tenda yang sudah dipilih sebelumnya.
  const restoredRef = useRef(false)

  const selectionKey = `tenda-sewa-selection:${sekolahId ?? '__draft__'}`

  function loadSelection(): Record<string, number> | null {
    try {
      const raw = window.localStorage.getItem(selectionKey)
      return raw ? (JSON.parse(raw) as Record<string, number>) : null
    } catch {
      return null
    }
  }

  function clearSelection() {
    window.localStorage.removeItem(selectionKey)
  }

  // Simpan pilihan tenda ke localStorage agar tidak hilang saat refresh (U2).
  // Hanya aktif SETELAH restore selesai (restoredRef true).
  useEffect(() => {
    if (!restoredRef.current) return
    const hasPilihan = Object.values(selection).some((jumlah) => jumlah > 0)
    if (hasPilihan) window.localStorage.setItem(selectionKey, JSON.stringify(selection))
    else window.localStorage.removeItem(selectionKey)
  }, [selection, selectionKey])

  async function fetchData() {
    try {
      const tendaRes = await fetch('/api/tenda')
      const tendaResult = await tendaRes.json()
      if (tendaResult.success) setTendaList(tendaResult.data)
      if (draftSekolah) {
        const estimasi = Number(draftSekolah.estimasiPesertaPendamping)
        setKapasitas({ namaLengkap: draftSekolah.namaSekolah.trim().replace(/\s+/g, ' ').toLocaleUpperCase('id-ID'), kodePendaftaran: 'Akan dibuat setelah bukti pembayaran dikirim', jumlahAktual: 0, estimasi, efektifJumlahOrang: estimasi, batasKapasitas: estimasi + TENDA_TOLERANSI, terkunci: false, reservasiAktif: false, reservasiBerakhirPada: null, pilihanSaatIni: [] })
        // Sekolah baru belum punya reservasi server — pulihkan pilihan dari localStorage.
        const saved = loadSelection()
        if (saved) setSelection(saved)
        return
      }
      const kapasitasRes = await fetch(`/api/sekolah/${sekolahId}/kapasitas-tenda`)
      const kapasitasResult = await kapasitasRes.json()
      if (kapasitasResult.success) {
        setKapasitas(kapasitasResult.data)
        if (kapasitasResult.data.reservasiAktif) {
          const prefill: Record<string, number> = {}
          for (const item of kapasitasResult.data.pilihanSaatIni) prefill[item.tendaJenisId] = item.jumlah
          setSelection(prefill)
        } else {
          // Tanpa reservasi aktif, pulihkan pilihan yang disimpan sebelumnya (U2).
          const saved = loadSelection()
          if (saved) setSelection(saved)
        }
      }
    } catch { toast.error('Gagal memuat data tenda') } finally {
      restoredRef.current = true
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, draftSekolah])
  if (isLoading || !kapasitas) return <div className="py-10 text-center"><p className="font-body text-sm text-event-navy/50">Memuat data...</p></div>

  const pilihanTersimpan = Object.fromEntries(kapasitas.pilihanSaatIni.map((item) => [item.tendaJenisId, item.jumlah]))
  const totalKapasitas = tendaList.reduce((total, tenda) => total + (selection[tenda.id] ?? 0) * tenda.kapasitasMax, 0)
  const totalBiaya = tendaList.reduce((total, tenda) => total + (selection[tenda.id] ?? 0) * tenda.harga, 0)
  const jumlahUnit = Object.values(selection).reduce((total, jumlah) => total + jumlah, 0)
  const kapasitasAktif = kapasitas!
  const kondisiKapasitas = jumlahUnit === 0 || totalKapasitas < kapasitas.efektifJumlahOrang ? 'kurang' : totalKapasitas > kapasitas.batasKapasitas ? 'berlebih' : 'cukup'

  function maxUntuk(tenda: TendaData) {
    const saatIni = selection[tenda.id] ?? 0
    const tersimpan = kapasitasAktif.reservasiAktif ? (pilihanTersimpan[tenda.id] ?? 0) : 0
    const stokEfektif = tenda.stokTersisa + tersimpan
    const maxKapasitas = Math.floor((kapasitasAktif.batasKapasitas - totalKapasitas + saatIni * tenda.kapasitasMax) / tenda.kapasitasMax)
    return Math.max(0, Math.min(stokEfektif, maxKapasitas))
  }

  async function simpanPilihan() {
    const pilihan = Object.entries(selection).filter(([, jumlah]) => jumlah > 0).map(([tendaJenisId, jumlah]) => ({ tendaJenisId, jumlah }))
    if (draftSekolah) {
      if (pilihan.length === 0) return toast.error('Pilih minimal satu tenda')
      const res = await fetch('/api/tenda/reservasi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sekolah: draftSekolah, pilihan }) })
      const result = await res.json()
      if (!res.ok) return toast.error(result.message || 'Gagal membuat reservasi')
      clearSelection()
      onSuccess(true, [{ tendaJenisId: result.data.id, jumlah: 1 }])
      return
    }
    if (pilihan.length === 0) {
      if (!window.confirm('Batalkan pilihan tenda? Reservasi dan tagihan tenda akan dihapus.')) return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/sekolah/${sekolahId}/tenda`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pilihan }) })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan pilihan tenda')
      clearSelection()
      if (pilihan.length === 0) {
        toast.success('Pilihan dan reservasi tenda dibatalkan')
        onSuccess(false)
        return
      }
      toast.success('Pilihan tenda disimpan. Lanjutkan dengan pembayaran untuk mengunci reservasi.')
      onSuccess(true)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan') } finally { setIsSubmitting(false) }
  }

  return <div className="flex flex-col gap-5">
    <div className="border-3 border-event-navy bg-white shadow-pixel-sm p-4"><p className="font-body font-bold text-sm text-event-navy">{kapasitas.namaLengkap}</p><p className="font-body text-xs text-event-navy/60">{kapasitas.kodePendaftaran}</p></div>
    {kapasitas.terkunci ? <div className="border-3 border-pmi-red bg-pmi-red/10 shadow-pixel-sm p-4 text-center"><p className="font-body text-sm text-event-navy">Pembayaran tenda sudah diproses sehingga pilihan tidak dapat diubah.</p></div> : <>
      <div className="border-3 border-event-navy bg-event-cream shadow-pixel-sm p-4 flex flex-col gap-1">
        <p className="font-body text-xs text-event-navy">Jumlah orang yang perlu ditampung: <span className="font-bold">{kapasitas.efektifJumlahOrang}</span>. Batas maksimal berdasarkan kebijakan panitia: <span className="font-bold">{kapasitas.batasKapasitas} orang</span>.</p>
        <p className="font-body text-[11px] text-event-navy/70">Kapasitas minimum pada tiap tenda adalah informasi dari vendor. Pilih kapasitas yang cukup agar seluruh rombongan tertampung.</p>
      </div>
      {kapasitas.reservasiAktif && kapasitas.reservasiBerakhirPada && <div className="border-3 border-event-blue bg-event-blue/10 shadow-pixel-sm p-3"><p className="font-body text-xs text-event-navy">Reservasi aktif sampai {new Date(kapasitas.reservasiBerakhirPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}. Upload bukti pembayaran sebelum waktu ini agar stok tetap terkunci.</p></div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{tendaList.map((tenda) => {
        const jumlah = selection[tenda.id] ?? 0
        const stokSetelahPilihan = Math.max(0, tenda.stokTersisa + (kapasitas.reservasiAktif ? (pilihanTersimpan[tenda.id] ?? 0) : 0) - jumlah)
        const habis = stokSetelahPilihan === 0 && jumlah === 0
        return <div key={tenda.id} className={`border-3 overflow-hidden flex flex-col shadow-pixel-sm ${jumlah > 0 ? 'border-event-blue bg-event-blue/5' : 'border-event-navy bg-white'}`}>
          <div className="relative aspect-[16/9] w-full bg-event-cream">
            {tenda.gambarUrl ? <Image src={tenda.gambarUrl} alt={tenda.nama} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" /> : <div className="h-full flex items-center justify-center"><Tent size={42} className="text-event-navy/20" /></div>}
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex-1"><p className="font-body font-bold text-sm text-event-navy">{tenda.nama}</p><p className="font-body text-xs text-event-navy/60">Kapasitas {tenda.kapasitasMin}-{tenda.kapasitasMax} orang · Rp{tenda.harga.toLocaleString('id-ID')}/unit</p><div className="mt-1"><Badge variant={habis ? 'warning' : 'info'}>{habis ? 'Stok habis' : `Stok tersisa: ${stokSetelahPilihan}`}</Badge></div></div>
            <div className="flex items-center justify-between gap-3 border-t border-event-navy/10 pt-3"><span className="font-body text-xs font-semibold text-event-navy/70">Jumlah unit</span><QuantityStepper value={jumlah} onChange={(value) => setSelection((current) => ({ ...current, [tenda.id]: value }))} max={maxUntuk(tenda)} disabled={habis} /></div>
          </div>
        </div>
      })}</div>
      <div className={`border-3 p-4 flex flex-col gap-2 sticky bottom-2 shadow-pixel-sm ${kondisiKapasitas === 'cukup' ? 'border-green-600 bg-green-50' : kondisiKapasitas === 'berlebih' ? 'border-event-yellow bg-event-yellow/20' : 'border-pmi-red bg-pmi-red/10'}`}><div className="flex justify-between font-body text-xs text-event-navy"><span>Kapasitas dipilih</span><span className="font-bold">{totalKapasitas} / kebutuhan {kapasitas.efektifJumlahOrang}</span></div><p className="font-body text-[11px] text-event-navy/70">{kondisiKapasitas === 'kurang' ? 'Kapasitas masih kurang. Tambahkan tenda sebelum melanjutkan pembayaran.' : kondisiKapasitas === 'berlebih' ? 'Kapasitas lebih besar dari kebutuhan, tetapi tetap diperbolehkan.' : 'Kapasitas pilihan mencukupi kebutuhan.'}</p><div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20"><span>TOTAL BIAYA TENDA</span><span>Rp{totalBiaya.toLocaleString('id-ID')}</span></div></div>
      <Button type="button" pixel variant={jumlahUnit > 0 ? 'primary' : 'outline'} onClick={simpanPilihan} isLoading={isSubmitting} disabled={jumlahUnit > 0 && kondisiKapasitas === 'kurang'} className="w-full">{jumlahUnit > 0 ? 'Simpan & Lanjut Pembayaran' : 'Batalkan Pilihan Tenda'}</Button>
    </>}
  </div>
}
