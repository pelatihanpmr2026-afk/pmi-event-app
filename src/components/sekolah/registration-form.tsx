'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ProgressStepper } from '@/components/panitia/progress-stepper'
import { StepDataSekolah, type DataSekolahResult } from './steps/step-data-sekolah'
import { StepPeserta } from './steps/step-peserta'
import { StepPendamping } from './steps/step-pendamping'
import { StepReviewKonfirmasi } from './steps/step-review-konfirmasi'
import { StepFinalPayment } from './steps/step-final-payment'
import { DraftBanner } from './draft-banner'
import { TermsGate } from './terms-gate'
import { saveDraft, loadDraft, clearDraft, savePhoto, loadPhoto, deletePhoto } from '@/lib/draft-storage'
import type { PesertaPendampingValues } from '@/lib/validations/peserta'

// PENTING: array ini harus punya 1 label untuk setiap nilai currentStep (1-5).
// Sebelumnya cuma ada 4 label padahal currentStep bisa sampai 5 (step
// pembayaran), jadi STEPS[currentStep - 1] jadi undefined dan
// `.toUpperCase()` di bawah bikin halaman crash begitu masuk ke step 5.
const STEPS = ['Data Sekolah', 'Data Peserta', 'Data Pendamping', 'Review', 'Pembayaran']

export function SekolahRegistrationForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [dataSekolah, setDataSekolah] = useState<DataSekolahResult | null>(null)
  const [dataPeserta, setDataPeserta] = useState<PesertaPendampingValues['peserta'] | null>(null)
  const [dataPendamping, setDataPendamping] = useState<PesertaPendampingValues['pendamping'] | null>(null)

  const [draftFound, setDraftFound] = useState<number | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cek draft saat mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = loadDraft()
      if (draft && draft.currentStep > 1) {
        setDraftFound(draft.savedAt)
      }
      setIsHydrated(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Auto-save dengan debounce 1 detik
  useEffect(() => {
    if (!isHydrated || draftFound !== null) return
    if (currentStep === 1 && !dataSekolah) return

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft({
        currentStep,
        dataSekolah,
        // File tidak bisa disimpan ke localStorage (ter-serialize jadi {}).
        // Simpan flag _hasFoto agar saat restore foto dimuat dari IndexedDB.
        dataPeserta: dataPeserta
          ? dataPeserta.map((p) => ({ ...p, foto: undefined, _hasFoto: p.foto instanceof File }))
          : null,
        dataPendamping: dataPendamping || null,
        sekolahId: null,
      })
      setLastSavedAt(Date.now())
    }, 1000)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [currentStep, dataSekolah, dataPeserta, dataPendamping, isHydrated, draftFound])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dataSekolah || dataPeserta || dataPendamping) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dataSekolah, dataPeserta, dataPendamping])

  // Simpan foto peserta ke IndexedDB (hanya jika ada perubahan)
  useEffect(() => {
    if (!isHydrated || !dataPeserta || draftFound !== null) return
    dataPeserta.forEach((p, i) => {
      if (p.foto instanceof File) {
        void savePhoto(`peserta_${i}`, p.foto)
      }
    })
    // Bersihkan kunci foto lama di indeks ≥ panjang daftar peserta saat ini.
    // Tanpa ini, jika peserta dihapus/dipindah, kunci lama masih tersisa dan
    // saat restore bisa termuat foto peserta yang salah.
    for (let i = dataPeserta.length; i < 200; i++) {
      void deletePhoto(`peserta_${i}`)
    }
  }, [dataPeserta, isHydrated, draftFound])

  const handleRestore = useCallback(async () => {
    setIsRestoring(true)
    try {
      const draft = loadDraft()
      if (!draft) return
      setDataSekolah(draft.dataSekolah as DataSekolahResult)
      
      // Pulihkan data peserta beserta foto (dengan tipe yang aman)
      if (draft.dataPeserta) {
        const rawPeserta = draft.dataPeserta as Array<Record<string, unknown> & { _hasFoto?: boolean }>
        const restoredPeserta: PesertaPendampingValues['peserta'] = await Promise.all(
          rawPeserta.map(async (p, i) => {
            const { _hasFoto, ...rest } = p
            let foto: File | undefined = undefined
            if (_hasFoto) {
              foto = (await loadPhoto(`peserta_${i}`)) ?? undefined
            }
            // Casting ke tipe yang benar untuk memenuhi syarat setDataPeserta
            return {
              ...rest,
              foto,
            } as PesertaPendampingValues['peserta'][number]
          })
        )
        setDataPeserta(restoredPeserta)
      }

      // Pulihkan data pendamping
      if (draft.dataPendamping) {
        setDataPendamping(draft.dataPendamping as PesertaPendampingValues['pendamping'])
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

  // Menyimpan peserta untuk draft: tulis SEMUA foto ke IndexedDB dulu (await)
  // Baru simpan objek draft — supaya saat toast sukses muncul, foto sudah
  // benar-benar tersimpan dan tidak hilang bila browser langsung ditutup.
  function pesertaToDraft(
    peserta: PesertaPendampingValues['peserta']
  ): Array<Record<string, unknown> & { _hasFoto: boolean; foto?: undefined }> {
    return peserta.map((p) => ({ ...p, foto: undefined as undefined, _hasFoto: p.foto instanceof File }))
  }

  async function persistPesertaPhotos(peserta: PesertaPendampingValues['peserta']) {
    await Promise.all(
      peserta.map((p, i) => (p.foto instanceof File ? savePhoto(`peserta_${i}`, p.foto) : Promise.resolve()))
    )
    for (let i = peserta.length; i < 200; i++) {
      void deletePhoto(`peserta_${i}`)
    }
  }

  async function simpanDraftPeserta(values: Pick<PesertaPendampingValues, 'peserta'>, step: number) {
    setDataPeserta(values.peserta)
    await persistPesertaPhotos(values.peserta)
    saveDraft({
      currentStep: step,
      dataSekolah,
      dataPeserta: pesertaToDraft(values.peserta),
      dataPendamping: dataPendamping ?? null,
      sekolahId: null,
    })
    setLastSavedAt(Date.now())
  }

  function handlePesertaComplete(values: Pick<PesertaPendampingValues, 'peserta'>) {
    setCurrentStep(3)
    void simpanDraftPeserta(values, 3)
  }

  // Disimpan dari tombol "Simpan Draft" di Step 2 — data peserta (termasuk
  // foto) ikut draft TANPA harus pindah dulu ke step pendamping.
  function handleSavePesertaDraft(values: Pick<PesertaPendampingValues, 'peserta'>) {
    void simpanDraftPeserta(values, currentStep).then(() => {
      toast.success('Draft peserta tersimpan. Data dan foto aman — lanjutkan kapan saja.')
    })
  }

  function handlePendampingComplete(values: Pick<PesertaPendampingValues, 'pendamping'>) {
    setDataPendamping(values.pendamping)
    setCurrentStep(4)
  }

  function handleSavePendampingDraft(values: Pick<PesertaPendampingValues, 'pendamping'>) {
    setDataPendamping(values.pendamping)
    saveDraft({
      currentStep,
      dataSekolah,
      dataPeserta: dataPeserta ? pesertaToDraft(dataPeserta) : null,
      dataPendamping: values.pendamping ?? null,
      sekolahId: null,
    })
    setLastSavedAt(Date.now())
    toast.success('Draft pendamping tersimpan — lanjutkan kapan saja.')
  }

  // Step review hanya menampilkan ringkasan data, belum mengirim apa pun ke
  // server (pengiriman sebenarnya + upload bukti transfer terjadi di
  // StepFinalPayment). Jadi di sini kita cuma pindah ke step 5, dan draft
  // BELUM dihapus dulu — supaya kalau user menutup browser saat masih di
  // step pembayaran, data yang sudah diisi tidak hilang percuma.
  function handleReviewComplete() {
    setCurrentStep(5)
  }

  // Draft baru dihapus setelah pendaftaran + bukti transfer benar-benar
  // berhasil terkirim ke server (dipanggil dari StepFinalPayment.onSubmitted).
  function handleFinalSubmitted(sekolahId: string) {
    clearDraft()
    router.push(`/sekolah/pembayaran/${sekolahId}`)
  }

  function handleDisagreeReset() {
    clearDraft()
    setDataSekolah(null)
    setDataPeserta(null)
    setDataPendamping(null)
    setCurrentStep(1)
  }

  // Kembali ke step sebelumnya dengan tetap mempertahankan data
  function goBack(fromStep: number) {
    if (fromStep === 2) setCurrentStep(1)
    else if (fromStep === 3) setCurrentStep(2)
    else if (fromStep === 4) setCurrentStep(3)
  }

  return (
    <TermsGate>
      <div className={`w-full mx-auto flex flex-col gap-6 ${currentStep === 2 || currentStep === 3 ? 'max-w-full' : 'max-w-2xl'}`}>
        {draftFound !== null && (
          <div className="max-w-2xl w-full mx-auto">
            <DraftBanner savedAt={draftFound} onRestore={handleRestore} onDiscard={handleDiscard} />
          </div>
        )}
        {isRestoring && <p className="font-body text-sm text-gray-400 text-center">Memulihkan data...</p>}

        <ProgressStepper steps={STEPS} currentStep={currentStep} />
        {lastSavedAt && <p className="font-body text-xs text-green-700 text-center">Tersimpan sebagai draft pada {new Date(lastSavedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>}

        <Card pixel>
          <CardHeader variant={currentStep === 4 || currentStep === 5 ? 'yellow' : 'blue'} pixel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-[11px] sm:text-sm">
                STEP {currentStep}: {STEPS[currentStep - 1].toUpperCase()}
              </h2>
              <div className="hidden sm:flex items-center gap-1.5" aria-hidden="true">
                <span className="w-2 h-2 bg-current opacity-50" />
                <span className="w-2 h-2 bg-current opacity-50" />
                <span className="w-2 h-2 bg-current opacity-50" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && (
              <StepDataSekolah onComplete={handleDataSekolahComplete} defaultValues={dataSekolah ?? undefined} />
            )}
            {currentStep === 2 && (
              <StepPeserta
                key="peserta"
                onComplete={handlePesertaComplete}
                onBack={() => goBack(2)}
                onSaveDraft={handleSavePesertaDraft}
                defaultValues={dataPeserta ? { peserta: dataPeserta } : undefined}
              />
            )}
            {currentStep === 3 && (
              <StepPendamping
                key="pendamping"
                onComplete={handlePendampingComplete}
                onBack={() => goBack(3)}
                onSaveDraft={handleSavePendampingDraft}
                defaultValues={dataPendamping ? { pendamping: dataPendamping } : undefined}
              />
            )}
            {currentStep === 4 && dataSekolah && dataPeserta && (
              <StepReviewKonfirmasi
                dataSekolah={dataSekolah}
                dataPeserta={{ peserta: dataPeserta, pendamping: dataPendamping ?? [] }}
                onComplete={handleReviewComplete}
                onBack={() => goBack(4)}
                onEdit={(step) => setCurrentStep(step)}
              />
            )}
            {currentStep === 5 && dataSekolah && dataPeserta && (
              <StepFinalPayment
                dataSekolah={dataSekolah}
                dataPeserta={{ peserta: dataPeserta, pendamping: dataPendamping ?? [] }}
                onBack={() => setCurrentStep(4)}
                onSubmitted={handleFinalSubmitted}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </TermsGate>
  )
}
