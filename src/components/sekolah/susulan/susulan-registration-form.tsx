'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ProgressStepper } from '@/components/panitia/progress-stepper'
import { StepPeserta } from '../steps/step-peserta'
import { StepPendamping } from '../steps/step-pendamping'
import { SusulanReviewPayment } from './susulan-review-payment'
import type { PesertaPendampingValues } from '@/lib/validations/peserta'

const STEPS = ['Peserta Susulan', 'Pendamping Susulan', 'Review & Pembayaran']

interface RiwayatBatch {
  batchKe: number
  statusPembayaran: 'BELUM_BAYAR' | 'MENUNGGU_KONFIRMASI' | 'LUNAS' | 'DITOLAK'
  jumlahBiaya: number
  jumlahPeserta: number
  jumlahPendamping: number
}

interface SusulanSummary {
  namaLengkap: string
  kodePendaftaran: string
  riwayatBatch: RiwayatBatch[]
  batchBerikutnya: number
}

export function SusulanRegistrationForm({ sekolahId }: { sekolahId: string }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [dataPeserta, setDataPeserta] = useState<PesertaPendampingValues['peserta'] | null>(null)
  const [dataPendamping, setDataPendamping] = useState<PesertaPendampingValues['pendamping'] | null>(null)
  const [summary, setSummary] = useState<SusulanSummary | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch(`/api/sekolah/${sekolahId}/susulan`)
        const result = await res.json()
        if (!res.ok || !result.success) {
          toast.error(result?.message || 'Gagal memuat data sekolah')
          router.push('/sekolah/susulan')
          return
        }
        setSummary(result.data)
      } finally {
        setIsLoadingSummary(false)
      }
    }
    loadSummary()
  }, [sekolahId, router])

  function handlePesertaComplete(values: Pick<PesertaPendampingValues, 'peserta'>) {
    setDataPeserta(values.peserta)
    setCurrentStep(2)
  }

  function handlePendampingComplete(values: Pick<PesertaPendampingValues, 'pendamping'>) {
    setDataPendamping(values.pendamping)
    setCurrentStep(3)
  }

  function handleSubmitted(pembayaranId: string) {
    router.push(`/sekolah/pembayaran/${sekolahId}?pembayaranId=${pembayaranId}`)
  }

  if (isLoadingSummary) {
    return <p className="font-body text-sm text-gray-400 text-center">Memuat data sekolah...</p>
  }

  if (!summary) return null

  return (
    <div className="w-full mx-auto flex flex-col gap-6 max-w-full">
      <div className="max-w-2xl w-full mx-auto border-3 border-event-navy bg-white p-3 text-center">
        <p className="font-body font-bold text-sm text-event-navy">{summary.namaLengkap}</p>
        <p className="font-body text-xs text-event-navy/60">{summary.kodePendaftaran}</p>
      </div>

      <ProgressStepper steps={STEPS} currentStep={currentStep} />

      <Card>
        <CardHeader variant={currentStep === 3 ? 'yellow' : 'blue'}>
          <h2 className="font-heading text-xs sm:text-sm">
            STEP {currentStep}: {STEPS[currentStep - 1].toUpperCase()}
          </h2>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <StepPeserta
              key="susulan-peserta"
              onComplete={handlePesertaComplete}
              onBack={() => router.push('/sekolah/susulan')}
              defaultValues={dataPeserta ? { peserta: dataPeserta } : undefined}
            />
          )}
          {currentStep === 2 && (
            <StepPendamping
              key="susulan-pendamping"
              onComplete={handlePendampingComplete}
              onBack={() => setCurrentStep(1)}
              defaultValues={dataPendamping ? { pendamping: dataPendamping } : undefined}
            />
          )}
          {currentStep === 3 && dataPeserta && (
            <SusulanReviewPayment
              sekolahId={sekolahId}
              dataPeserta={{ peserta: dataPeserta, pendamping: dataPendamping ?? [] }}
              riwayatBatch={summary.riwayatBatch}
              batchBerikutnya={summary.batchBerikutnya}
              onBack={() => setCurrentStep(2)}
              onSubmitted={handleSubmitted}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}