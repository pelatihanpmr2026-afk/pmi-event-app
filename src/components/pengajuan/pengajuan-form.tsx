'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProgressStepper } from '@/components/panitia/progress-stepper'
import { StepDataPengaju } from './step-data-pengaju'
import { StepItems } from './step-items'
import type { DataPengajuValues, ItemBarangValues } from '@/lib/validations/pengajuan-anggaran'

const STEPS = ['Data Pengaju', 'Rincian & Kirim']

const DRAFT_KEY = 'pmr2026_pengajuan_draft_v1'

interface DraftPengajuan {
  dataPengaju: DataPengajuValues
  items: ItemBarangValues[]
  signature: string | null
}

function loadDraft(): DraftPengajuan | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DraftPengajuan
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.dataPengaju || !Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

function saveDraft(draft: DraftPengajuan | null) {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    // localStorage penuh/gagal — abaikan, draft bersifat best-effort.
  }
}

export function PengajuanForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [dataPengaju, setDataPengaju] = useState<DataPengajuValues | null>(null)
  const [items, setItems] = useState<ItemBarangValues[] | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [showRestore, setShowRestore] = useState(false)

  // Muat draft dari localStorage sekali saat mount (hanya browser).
  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDataPengaju(draft.dataPengaju)
      setItems(draft.items)
      setSignature(draft.signature)
      setShowRestore(true)
      setCurrentStep(draft.dataPengaju ? 2 : 1)
    }
  }, [])

  // Simpan draft otomatis setiap data berubah.
  useEffect(() => {
    if (!dataPengaju && !items) {
      saveDraft(null)
      return
    }
    saveDraft({ dataPengaju: dataPengaju ?? ({} as DataPengajuValues), items: items ?? [], signature })
  }, [dataPengaju, items, signature])

  function handleDataPengajuComplete(values: DataPengajuValues) {
    setDataPengaju(values)
    setCurrentStep(2)
  }

  const handleItemsChange = useCallback((nextItems: ItemBarangValues[]) => {
    setItems(nextItems)
  }, [])

  const handleSignatureChange = useCallback((nextSignature: string | null) => {
    setSignature(nextSignature)
  }, [])

  function handleSubmitted(pengajuanId: string) {
    saveDraft(null)
    router.push(`/pengajuan-anggaran/sukses?id=${pengajuanId}`)
  }

  function restoreDraft() {
    setShowRestore(false)
  }

  function discardDraft() {
    saveDraft(null)
    setDataPengaju(null)
    setItems(null)
    setSignature(null)
    setCurrentStep(1)
    setShowRestore(false)
  }

  return (
    <div className={`w-full mx-auto flex flex-col gap-6 ${currentStep === 2 ? 'max-w-3xl' : 'max-w-2xl'}`}>
      <ProgressStepper steps={STEPS} currentStep={currentStep} />

      {showRestore && (
        <div className="flex flex-col gap-2 border-3 border-event-yellow bg-event-yellow/20 p-4">
          <p className="font-body text-xs font-bold text-event-navy">
            Draft pengajuan ditemukan — lanjutkan dari yang terakhir kali kamu kerjakan.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" onClick={restoreDraft} className="flex-1">Lanjutkan Draft</Button>
            <Button variant="outline" onClick={discardDraft} className="flex-1">Hapus Draft</Button>
          </div>
        </div>
      )}

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
            <StepItems
              dataPengaju={dataPengaju}
              defaultItems={items ?? undefined}
              defaultSignature={signature ?? undefined}
              onItemsChange={handleItemsChange}
              onSignatureChange={handleSignatureChange}
              onBack={() => setCurrentStep(1)}
              onSubmitted={handleSubmitted}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}