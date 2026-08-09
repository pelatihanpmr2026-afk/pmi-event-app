'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Tent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuantityStepper } from '@/components/ui/quantity-stepper'

interface TendaData {
  id: string
  nama: string
  kapasitasMin: number
  kapasitasMax: number
  harga: number
  stokTersisa: number
}

interface KapasitasInfo {
  namaLengkap: string
  kodePendaftaran: string
  jumlahAktual: number
  estimasi: number
  efektifJumlahOrang: number
  batasKapasitas: number
  terkunci: boolean
  pilihanSaatIni: { tendaJenisId: string; jumlah: number }[]
}

export function PemilihanTenda({ sekolahId, onSuccess }: { sekolahId: string; onSuccess: () => void }) {
  const [tendaList, setTendaList] = useState<TendaData[]>([])
  const [kapasitas, setKapasitas] = useState<KapasitasInfo | null>(null)
  const [selection, setSelection] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [tendaRes, kapasitasRes] = await Promise.all([
          fetch('/api/tenda'),
          fetch(`/api/sekolah/${sekolahId}/kapasitas-tenda`),
        ])
        const tendaResult = await tendaRes.json()
        const kapasitasResult = await kapasitasRes.json()

        if (tendaResult.success) setTendaList(tendaResult.data)
        if (kapasitasResult.success) {
          setKapasitas(kapasitasResult.data)
          const prefill: Record<string, number> = {}
          for (const p of kapasitasResult.data.pilihanSaatIni) {
            prefill[p.tendaJenisId] = p.jumlah
          }
          setSelection(prefill)
        }
      } catch {
        toast.error('Gagal memuat data')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [sekolahId])

  if (isLoading || !kapasitas) {
    return (
      <div className="py-10 text-center">
        <p className="font-body text-sm text-event-navy/50">Memuat data...</p>
      </div>
    )
  }

  const { batasKapasitas, terkunci } = kapasitas

  const totalKapasitasDipilih = tendaList.reduce((sum, t) => {
    const jumlah = selection[t.id] ?? 0
    return sum + jumlah * t.kapasitasMax
  }, 0)

  const totalBiayaTenda = tendaList.reduce((sum, t) => {
    const jumlah = selection[t.id] ?? 0
    return sum + jumlah * t.harga
  }, 0)

  const sisaKapasitas = batasKapasitas - totalKapasitasDipilih

function getMaxUntukTenda(tenda: TendaData): number {
  const jumlahSekarang = selection[tenda.id] ?? 0

  // Stok tersisa dari API sudah exclude sekolah lain, tapi belum menghitung
  // pilihan sekolah ini sendiri yang sedang di-edit — tambahkan balik.
  const stokEfektif = tenda.stokTersisa + jumlahSekarang

  // Kapasitas yang tersedia kalau tenda jenis ini di-reset ke 0 dulu:
  // sisa kapasitas saat ini + kapasitas yang sedang dipakai tenda jenis ini.
  const kapasitasTersediaUntukJenisIni = sisaKapasitas + jumlahSekarang * tenda.kapasitasMax

  // Berapa unit tenda jenis ini yang muat dalam kapasitas tersebut.
  const maxByCapacity = Math.floor(kapasitasTersediaUntukJenisIni / tenda.kapasitasMax)

  return Math.max(0, Math.min(stokEfektif, maxByCapacity))
}

  function handleChange(tendaId: string, value: number) {
    setSelection((prev) => ({ ...prev, [tendaId]: value }))
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const pilihan = Object.entries(selection)
        .filter(([, jumlah]) => jumlah > 0)
        .map(([tendaJenisId, jumlah]) => ({ tendaJenisId, jumlah }))

      const res = await fetch(`/api/sekolah/${sekolahId}/tenda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilihan }),
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan pilihan tenda')

      toast.success('Pilihan tenda berhasil disimpan')
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-3 border-event-navy bg-white p-4">
        <p className="font-body font-bold text-sm text-event-navy">{kapasitas.namaLengkap}</p>
        <p className="font-body text-xs text-event-navy/60">{kapasitas.kodePendaftaran}</p>
      </div>

      {terkunci ? (
        <div className="border-3 border-pmi-red bg-pmi-red/10 p-4 text-center">
          <p className="font-body text-sm text-event-navy">
            Pembayaran tenda sekolah ini sudah diproses, tidak bisa diubah lagi.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-event-cream border-3 border-event-navy p-4">
            <p className="font-body text-xs text-event-navy/70">
              🏕️ {kapasitas.jumlahAktual > 0 ? `${kapasitas.jumlahAktual} peserta terdaftar` : `Estimasi ${kapasitas.estimasi} orang`}
              . Batas maksimal kapasitas tenda:{' '}
              <span className="font-bold">{batasKapasitas} orang</span>.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {tendaList.map((tenda) => {
              const jumlah = selection[tenda.id] ?? 0
              const maxBisaDipilih = getMaxUntukTenda(tenda)
              const habis = tenda.stokTersisa === 0 && jumlah === 0

              return (
                <div
                  key={tenda.id}
                  className={`border-3 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${
                    jumlah > 0 ? 'border-event-blue bg-event-blue/5' : 'border-event-navy bg-white'
                  }`}
                >
                  <div className="w-10 h-10 bg-event-navy/10 border-2 border-event-navy flex items-center justify-center shrink-0">
                    <Tent size={18} className="text-event-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-bold text-sm text-event-navy">{tenda.nama}</p>
                    <p className="font-body text-xs text-event-navy/60">
                      Kapasitas {tenda.kapasitasMin}-{tenda.kapasitasMax} orang · Rp
                      {tenda.harga.toLocaleString('id-ID')}/unit
                    </p>
                    <div className="mt-1">
                      {habis ? (
                        <Badge variant="warning">Stok habis</Badge>
                      ) : (
                        <Badge variant="info">Stok tersisa: {tenda.stokTersisa + jumlah}</Badge>
                      )}
                    </div>
                  </div>
                  <QuantityStepper
                    value={jumlah}
                    onChange={(val) => handleChange(tenda.id, val)}
                    max={maxBisaDipilih}
                    disabled={habis}
                  />
                </div>
              )
            })}
          </div>

          <div className="border-3 border-event-navy bg-event-yellow/20 p-4 flex flex-col gap-1.5 sticky bottom-2">
            <div className="flex justify-between font-body text-xs text-event-navy">
              <span>Kapasitas tenda dipilih</span>
              <span className="font-bold">
                {totalKapasitasDipilih} / {batasKapasitas} orang
              </span>
            </div>
            <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20">
              <span>TOTAL BIAYA TENDA</span>
              <span>Rp{totalBiayaTenda.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <Button type="button" variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            Simpan Pilihan Tenda
          </Button>
        </>
      )}
    </div>
  )
}