'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ProgressStepper } from '@/components/panitia/progress-stepper'
import { StepDataPengaju } from './step-data-pengaju'
import { StepItems } from './step-items'
import type { DataPengajuValues } from '@/lib/validations/pengajuan-anggaran'

const STEPS = ['Data Pengaju', 'Rincian & Kirim']

export function PengajuanForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [dataPengaju, setDataPengaju] = useState<DataPengajuValues | null>(null)

  function handleDataPengajuComplete(values: DataPengajuValues) {
    setDataPengaju(values)
    setCurrentStep(2)
  }

  function handleSubmitted(pengajuanId: string) {
    router.push(`/pengajuan-anggaran/sukses?id=${pengajuanId}`)
  }

  return (
   <div className={`w-full mx-auto flex flex-col gap-6 ${currentStep === 2 ? 'max-w-3xl' : 'max-w-2xl'}`}>
      <ProgressStepper steps={STEPS} currentStep={currentStep} />

      <Card>
        <CardHeader variant="blue">
          <h2 className="font-heading text-xs sm:text-sm">
            STEP {currentStep}: {STEPS[currentStep - 1].toUpperCase()}
          </h2>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <StepDataPengaju onComplete={handleDataPengajuComplete} defaultValues={dataPengaju ?? undefined} />
          )}
          {currentStep === 2 && dataPengaju && (
            <StepItems dataPengaju={dataPengaju} onBack={() => setCurrentStep(1)} onSubmitted={handleSubmitted} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}