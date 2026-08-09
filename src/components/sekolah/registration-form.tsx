'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ProgressStepper } from '@/components/panitia/progress-stepper'
import { StepDataSekolah, type DataSekolahResult } from './steps/step-data-sekolah'
import { StepPesertaPendamping } from './steps/step-peserta-pendamping'
import { StepReviewKonfirmasi } from './steps/step-review-konfirmasi'
import { StepFinalPayment } from './steps/step-final-payment'
import { DraftBanner } from './draft-banner'
import { saveDraft, loadDraft, clearDraft, savePhoto, loadPhoto } from '@/lib/draft-storage'
import type { PesertaPendampingValues } from '@/lib/validations/peserta'

const STEPS = ['Data Sekolah', 'Peserta & Pendamping', 'Review', 'Pembayaran']

export function SekolahRegistrationForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [dataSekolah, setDataSekolah] = useState<DataSekolahResult | null>(null)
  const [dataPeserta, setDataPeserta] = useState<PesertaPendampingValues | null>(null)

  const [draftFound, setDraftFound] = useState<number | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = loadDraft()
      if (draft && draft.currentStep > 1) setDraftFound(draft.savedAt)
      setIsHydrated(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isHydrated || draftFound !== null) return
    if (currentStep === 1 && !dataSekolah) return

    saveDraft({
      currentStep,
      dataSekolah,
      dataPeserta: dataPeserta
        ? {
            peserta: dataPeserta.peserta.map(({ foto, ...rest }) => ({ ...rest, _hasFoto: foto instanceof File })),
            pendamping: dataPeserta.pendamping,
          }
        : null,
      sekolahId: null,
    })
  }, [currentStep, dataSekolah, dataPeserta, isHydrated, draftFound])

  useEffect(() => {
    if (!isHydrated || !dataPeserta || draftFound !== null) return
    dataPeserta.peserta.forEach((p, i) => {
      if (p.foto instanceof File) void savePhoto(`foto_${i}`, p.foto)
    })
  }, [dataPeserta, isHydrated, draftFound])

  const handleRestore = useCallback(async () => {
    setIsRestoring(true)
    try {
      const draft = loadDraft()
      if (!draft) return
      setDataSekolah(draft.dataSekolah as DataSekolahResult)

      if (draft.dataPeserta) {
        const raw = draft.dataPeserta as {
          peserta: (Record<string, unknown> & { _hasFoto?: boolean })[]
          pendamping: unknown[]
        }
        const pesertaRestored = await Promise.all(
          raw.peserta.map(async (p, i) => {
            const { _hasFoto, ...rest } = p
            const foto = _hasFoto ? await loadPhoto(`foto_${i}`) : null
            return { ...rest, foto: foto ?? undefined }
          })
        )
        const fotoHilang = pesertaRestored.filter((p) => !p.foto).length
        setDataPeserta({ peserta: pesertaRestored, pendamping: raw.pendamping } as PesertaPendampingValues)
        if (fotoHilang > 0) toast.warning(`${fotoHilang} foto peserta tidak berhasil dipulihkan, mohon upload ulang`)
      }

      setCurrentStep(draft.currentStep)
      setDraftFound(null)
      toast.success('Data berhasil dipulihkan')
    } finally {
      setIsRestoring(false)
    }
  }, [])

  function handleDiscard() {
    clearDraft()
    setDraftFound(null)
    toast.success('Draft dihapus, silakan mulai dari awal')
  }

  function handleDataSekolahComplete(result: DataSekolahResult) {
    setDataSekolah(result)
    setCurrentStep(2)
  }

  function handlePesertaComplete(result: PesertaPendampingValues) {
    setDataPeserta(result)
    setCurrentStep(3)
  }

  function handleReviewComplete() {
    setCurrentStep(4)
  }

  function handleFinalSubmitted(sekolahId: string) {
    clearDraft()
    router.push(`/sekolah/pembayaran/${sekolahId}`)
  }

  function handleDisagreeReset() {
    clearDraft()
    setDataSekolah(null)
    setDataPeserta(null)
    setCurrentStep(1)
  }

  return (
    <div className={`w-full mx-auto flex flex-col gap-6 ${currentStep === 2 ? 'max-w-full' : 'max-w-2xl'}`}>
      {draftFound !== null && (
        <div className="max-w-2xl w-full mx-auto">
          <DraftBanner savedAt={draftFound} onRestore={handleRestore} onDiscard={handleDiscard} />
        </div>
      )}
      {isRestoring && <p className="font-body text-sm text-event-navy/60 text-center">Memulihkan data...</p>}

      <ProgressStepper steps={STEPS} currentStep={currentStep} />

      <Card>
        <CardHeader variant={currentStep === 3 ? 'yellow' : 'blue'}>
          <h2 className="font-heading text-xs sm:text-sm">
            STEP {currentStep}: {STEPS[currentStep - 1].toUpperCase()}
          </h2>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <StepDataSekolah onComplete={handleDataSekolahComplete} defaultValues={dataSekolah ?? undefined} />
          )}
          {currentStep === 2 && (
            <StepPesertaPendamping
              onComplete={handlePesertaComplete}
              onBack={() => setCurrentStep(1)}
              defaultValues={dataPeserta ?? undefined}
              onDraftChange={(values) => setDataPeserta(values)}
            />
          )}
          {currentStep === 3 && dataSekolah && dataPeserta && (
            <StepReviewKonfirmasi
              dataSekolah={dataSekolah}
              dataPeserta={dataPeserta}
              onComplete={handleReviewComplete}
              onBack={() => setCurrentStep(2)}
              onDisagreeReset={handleDisagreeReset}
            />
          )}
          {currentStep === 4 && dataSekolah && dataPeserta && (
            <StepFinalPayment
              dataSekolah={dataSekolah}
              dataPeserta={dataPeserta}
              onBack={() => setCurrentStep(3)}
              onSubmitted={handleFinalSubmitted}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}