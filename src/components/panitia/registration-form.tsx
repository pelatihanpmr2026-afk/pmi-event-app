'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ProgressStepper } from './progress-stepper'
import { StepBiodata } from './steps/step-biodata'
import { StepKeanggotaan } from './steps/step-keanggotaan'
import { StepFoto } from './steps/step-foto'
import { StepReview } from './steps/step-review'
import { panitiaFormSchema, PanitiaFormValues } from '@/lib/validations/panitia'

const STEPS = ['Biodata', 'Keanggotaan', 'Foto', 'Review']

const STEP_FIELDS: Record<number, (keyof PanitiaFormValues)[]> = {
  1: ['nama', 'gender', 'noWhatsapp', 'alamat'],
  2: ['asalUnit', 'divisi'],
  3: ['foto'],
  4: [],
}

export function RegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const form = useForm<PanitiaFormValues>({
    resolver: zodResolver(panitiaFormSchema),
    mode: 'onChange',
    defaultValues: {
      nama: '',
      noWhatsapp: '',
      alamat: '',
    },
  })

  async function handleNext() {
    const fields = STEP_FIELDS[currentStep]
    const isValid = await form.trigger(fields.length ? fields : undefined)
    if (!isValid) {
      toast.error('Mohon lengkapi data dengan benar sebelum lanjut')
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  async function onSubmit(values: PanitiaFormValues) {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('nama', values.nama)
      formData.append('gender', values.gender)
      formData.append('noWhatsapp', values.noWhatsapp)
      formData.append('alamat', values.alamat)
      formData.append('asalUnit', values.asalUnit)
      formData.append('divisi', values.divisi)
      formData.append('foto', values.foto)

      const res = await fetch('/api/panitia', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || 'Terjadi kesalahan saat mendaftar')
      }

      toast.success('Pendaftaran berhasil!')
      router.push(`/panitia/sukses?id=${data.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      <ProgressStepper steps={STEPS} currentStep={currentStep} />

      <Card>
        <CardHeader variant={currentStep === 4 ? 'yellow' : 'blue'}>
          <h2 className="font-heading text-xs sm:text-sm">
            STEP {currentStep}: {STEPS[currentStep - 1].toUpperCase()}
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            {currentStep === 1 && <StepBiodata form={form} />}
            {currentStep === 2 && <StepKeanggotaan form={form} />}
            {currentStep === 3 && <StepFoto form={form} />}
            {currentStep === 4 && <StepReview form={form} />}

            <div className="flex justify-between gap-3 pt-2">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" onClick={handleBack}>
                  Kembali
                </Button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length ? (
                <Button type="button" variant="primary" onClick={handleNext}>
                  Lanjut
                </Button>
              ) : (
                <Button type="submit" variant="secondary" isLoading={isSubmitting}>
                  Kirim Pendaftaran
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}