'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { compressImage } from '@/lib/compress-image'
import { dataSekolahSchema } from '@/lib/validations/sekolah'
import { pesertaMetaArraySchema, pendampingArraySchema } from '@/lib/validations/peserta'
import type { PesertaPendampingValues } from '@/lib/validations/peserta'

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type })
}

// PENTING: array ini harus punya 1 label untuk setiap nilai currentStep (1-5).
// Sebelumnya cuma ada 4 label padahal currentStep bisa sampai 5 (step
// pembayaran), jadi STEPS[currentStep - 1] jadi undefined dan
// `.toUpperCase()` di bawah bikin halaman crash begitu masuk ke step 5.
const STEPS = ['Data Sekolah', 'Data Peserta', 'Data Pendamping', 'Review', 'Pembayaran']

export function SekolahRegistrationForm({
  adminDraftId,
  resumeDraftId,
  resumeToken,
  onDone,
}: {
  adminDraftId?: string
  resumeDraftId?: string
  resumeToken?: string
  onDone?: (sekolahId: string) => void
} = {}) {
  const router = useRouter()
  const isAdmin = !!adminDraftId
  const isResume = !isAdmin && !!resumeDraftId && !!resumeToken
  // Draft yang berasal dari SERVER (diperbarui panitia/admin): jangan nimbrung
  // dengan draft localStorage milik user maupun auto-save perangkat lokal.
  const hasServerDraft = isAdmin || isResume

  const [currentStep, setCurrentStep] = useState(1)
  const [dataSekolah, setDataSekolah] = useState<DataSekolahResult | null>(null)
  const [dataPeserta, setDataPeserta] = useState<PesertaPendampingValues['peserta'] | null>(null)
  const [dataPendamping, setDataPendamping] = useState<PesertaPendampingValues['pendamping'] | null>(null)

  const [draftFound, setDraftFound] = useState<number | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const [serverDraftLoading, setServerDraftLoading] = useState(hasServerDraft)
  const [serverDraftError, setServerDraftError] = useState<string | null>(null)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cek apakah data form lolos skema SERVER (bukan hanya skema step). Dipakai
  // saat restore draft agar user TIDAK tersangkut di step pembayaran dengan
  // data yang nanti ditolak server ("Data peserta tidak valid").
  function firstInvalidStep(data: {
    dataSekolah: DataSekolahResult | null
    dataPeserta: PesertaPendampingValues['peserta'] | null
    dataPendamping: PesertaPendampingValues['pendamping'] | null
  }): 0 | 1 | 2 | 3 {
    if (!data.dataSekolah || !dataSekolahSchema.safeParse(data.dataSekolah).success) return 1
    const pesertaPayload = data.dataPeserta
      ? data.dataPeserta.map((pesertaItem) => {
          const rest = { ...pesertaItem }
          delete rest.foto
          return rest
        })
      : null
    if (!pesertaPayload || !pesertaMetaArraySchema.safeParse(pesertaPayload).success) return 2
    if (data.dataPendamping && !pendampingArraySchema.safeParse(data.dataPendamping).success) return 3
    return 0
  }

  // Cek draft saat mount (mode mandiri tanpa draft server)
  useEffect(() => {
    if (hasServerDraft) return
    const timer = setTimeout(() => {
      const draft = loadDraft()
      if (draft) {
        setDraftFound(draft.savedAt)
      }
      setIsHydrated(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [hasServerDraft])

  // Mode dengan draft server (admin via [id], publik via token resume):
  // fetch draft dari server
  useEffect(() => {
    if (!isAdmin && !isResume) return
    let cancelled = false
    ;(async () => {
      try {
        const url = isAdmin
          ? `/api/draft/${adminDraftId}`
          : `/api/draft/public/resume?draft=${encodeURIComponent(resumeDraftId!)}&token=${encodeURIComponent(resumeToken!)}`
        const res = await fetch(url)
        const json = await res.json()
        if (!json.success) throw new Error(json.message)
        const d = json.data

        // Selesaikan konversi foto BERDULU, baru set semua state bersamaan —
        // supaya step yang aktif tidak pernah mount dengan defaultValues kosong.
        let restoredPeserta: PesertaPendampingValues['peserta'] | undefined
        if (Array.isArray(d.dataPeserta)) {
          restoredPeserta = await Promise.all(
            (d.dataPeserta as Array<Record<string, unknown> & { foto?: string | null }>).map(
              async (p, i) => {
                const { foto, ...rest } = p
                let fileFoto: File | undefined
                if (foto) fileFoto = await dataUrlToFile(foto, `foto-${i}.jpg`)
                return { ...rest, foto: fileFoto } as PesertaPendampingValues['peserta'][number]
              }
            )
          )
        }

        setDataSekolah(d.dataSekolah as DataSekolahResult)
        if (restoredPeserta) setDataPeserta(restoredPeserta)
        if (d.dataPendamping) {
          setDataPendamping(d.dataPendamping as PesertaPendampingValues['pendamping'])
        }
        // Draft server bisa saja dari versi skema lama — paksa kembali ke step
        // pertama yang datanya invalid supaya user mengisi ulang, bukan gagal
        // di submit.
        const invalidStep = firstInvalidStep({
          dataSekolah: d.dataSekolah as DataSekolahResult | null,
          dataPeserta: restoredPeserta ?? null,
          dataPendamping: (d.dataPendamping as PesertaPendampingValues['pendamping'] | undefined) ?? null,
        })
        if (invalidStep !== 0) {
          setDataSekolah(null)
          setCurrentStep(1)
          setServerDraftError(
            'Draft dari versi lama dan beberapa datanya tidak lengkap. Silakan isi dari awal.'
          )
          return
        }
        setCurrentStep(d.currentStep)
      } catch (err) {
        if (!cancelled) setServerDraftError(err instanceof Error ? err.message : 'Gagal memuat draft')
      } finally {
        if (!cancelled) setServerDraftLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isAdmin, isResume, adminDraftId, resumeDraftId, resumeToken])

  // Auto-save dengan debounce 1 detik
  useEffect(() => {
    if (hasServerDraft || !isHydrated || draftFound !== null) return
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
}, [currentStep, dataSekolah, dataPeserta, dataPendamping, isHydrated, draftFound, hasServerDraft])

  useEffect(() => {
    if (hasServerDraft) return
    const warn = (event: BeforeUnloadEvent) => { if (dataSekolah || dataPeserta || dataPendamping) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dataSekolah, dataPeserta, dataPendamping, hasServerDraft])

  // Simpan foto peserta ke IndexedDB (hanya jika ada perubahan)
  useEffect(() => {
    if (hasServerDraft || !isHydrated || !dataPeserta || draftFound !== null) return
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
  }, [dataPeserta, isHydrated, draftFound, hasServerDraft])

  const handleRestore = useCallback(async () => {
    setIsRestoring(true)
    try {
      const draft = loadDraft()
      if (!draft) return
      setDataSekolah(draft.dataSekolah as DataSekolahResult)
      
      // Pulihkan data peserta beserta foto (dengan tipe yang aman)
      let restoredPeserta: PesertaPendampingValues['peserta'] | null = null
      if (draft.dataPeserta) {
        const rawPeserta = draft.dataPeserta as Array<Record<string, unknown> & { _hasFoto?: boolean }>
        restoredPeserta = await Promise.all(
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
      const restoredPendamping = draft.dataPendamping
        ? (draft.dataPendamping as PesertaPendampingValues['pendamping'])
        : null
      if (restoredPendamping) {
        setDataPendamping(restoredPendamping)
      }

      setCurrentStep(draft.currentStep)
      setDraftFound(null)
      toast.success('Data berhasil dipulihkan')

      // Draft lama mungkin lolos auto-save versi lebih tua — pastikan user
      // tidak bisa submit data yang ditolak server.
      const invalidStep = firstInvalidStep({
        dataSekolah: draft.dataSekolah as DataSekolahResult | null,
        dataPeserta: restoredPeserta,
        dataPendamping: restoredPendamping,
      })
      if (invalidStep !== 0) {
        setCurrentStep(invalidStep)
        if (invalidStep === 1) setDataSekolah(null)
        toast.info('Sebagian data draft perlu dilengkapi kembali sebelum pembayaran.')
      }
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

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function syncDraftToServer(peserta: PesertaPendampingValues['peserta'] | null, pendamping: PesertaPendampingValues['pendamping'] | null, step: number) {
    if (!dataSekolah) return
    try {
      // Kompres foto dulu supaya payload tidak melewati batas ukuran request
      // (413 membuat draft tidak pernah tercatat di server panitia).
      const pesertaPayload = peserta
        ? await Promise.all(peserta.map(async (p) => {
            let foto: string | null = null
            if (p.foto instanceof File) {
              try {
                foto = await fileToBase64(await compressImage(p.foto, 720, 0.6))
              } catch {
                foto = await fileToBase64(p.foto)
              }
            }
            const rest = { ...p }
            delete rest.foto
            return { ...rest, foto }
          }))
        : null

      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStep: step,
          dataSekolah,
          dataPeserta: pesertaPayload,
          dataPendamping: pendamping ?? null,
        }),
      })
      // Jangan sembunyikan kegagalan: kalau draft tidak sampai ke server
      // panitia, user harus diberi tahu (draft lokal tetap tersimpan).
      if (!res.ok) {
        toast.warning('Draft tersimpan di perangkat ini, tapi belum tersinkron ke server panitia — mungkin terganggu jaringan/kuota. Silakan coba simpan lagi nanti.')
      }
    } catch {
      toast.warning('Draft tersimpan di perangkat ini, tapi belum tersinkron ke server panitia. Silakan coba simpan lagi nanti.')
    }
  }

  async function simpanDraftPeserta(values: Pick<PesertaPendampingValues, 'peserta'>, step: number) {
    setDataPeserta(values.peserta)
    await persistPesertaPhotos(values.peserta)
    if (!hasServerDraft) {
      saveDraft({
        currentStep: step,
        dataSekolah,
        dataPeserta: pesertaToDraft(values.peserta),
        dataPendamping: dataPendamping ?? null,
        sekolahId: null,
      })
    }
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
      void syncDraftToServer(values.peserta, dataPendamping ?? null, currentStep)
      toast.success('Draft peserta tersimpan. Data dan foto aman — lanjutkan kapan saja.')
    })
  }

  function handlePendampingComplete(values: Pick<PesertaPendampingValues, 'pendamping'>) {
    setDataPendamping(values.pendamping)
    setCurrentStep(4)
  }

  function handleSavePendampingDraft(values: Pick<PesertaPendampingValues, 'pendamping'>) {
    setDataPendamping(values.pendamping)
    if (!hasServerDraft) {
      saveDraft({
        currentStep,
        dataSekolah,
        dataPeserta: dataPeserta ? pesertaToDraft(dataPeserta) : null,
        dataPendamping: values.pendamping ?? null,
        sekolahId: null,
      })
    }
    setLastSavedAt(Date.now())
    void syncDraftToServer(dataPeserta ?? null, values.pendamping ?? null, currentStep)
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
    if (isAdmin && adminDraftId) {
      void fetch(`/api/draft/${adminDraftId}`, { method: 'DELETE' }).catch(() => {})
      onDone?.(sekolahId)
    } else if (isResume && resumeDraftId && resumeToken) {
      // Mode resume publik: draft server dicabut setelah pendaftaran selesai
      // supaya link tidak bisa dipakai lagi untuk mendaftar ganda.
      const qs = `draft=${encodeURIComponent(resumeDraftId)}&token=${encodeURIComponent(resumeToken)}`
      void fetch(`/api/draft/public/resume?${qs}`, { method: 'DELETE' }).catch(() => {})
      router.push(`/sekolah/pembayaran/${sekolahId}`)
    } else {
      router.push(`/sekolah/pembayaran/${sekolahId}`)
    }
  }

  // Kembali ke step sebelumnya dengan tetap mempertahankan data
  function goBack(fromStep: number) {
    if (fromStep === 2) setCurrentStep(1)
    else if (fromStep === 3) setCurrentStep(2)
    else if (fromStep === 4) setCurrentStep(3)
  }

  return (
    <FormGate
      loading={serverDraftLoading}
      error={serverDraftError}
      fallbackHref={isAdmin ? '/dashboard/draft' : '/sekolah/daftar'}
      terms={!isAdmin}
    >
      <div className={`w-full mx-auto flex flex-col gap-6 ${currentStep === 2 || currentStep === 3 ? 'max-w-full' : 'max-w-2xl'}`}>
        {!hasServerDraft && draftFound !== null && (
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
                onSaveDraft={isAdmin ? undefined : handleSavePesertaDraft}
                defaultValues={dataPeserta ? { peserta: dataPeserta } : undefined}
              />
            )}
            {currentStep === 3 && (
              <StepPendamping
                key="pendamping"
                onComplete={handlePendampingComplete}
                onBack={() => goBack(3)}
                onSaveDraft={isAdmin ? undefined : handleSavePendampingDraft}
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
                onInvalidStep={(step) => {
                  setCurrentStep(step)
                  if (step === 1) setDataSekolah(null)
                  toast.info('Lengkapi data di step tersebut lalu kembali ke pembayaran.')
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </FormGate>
  )
}

function FormGate({
  loading,
  error,
  fallbackHref,
  terms,
  children,
}: {
  loading: boolean
  error: string | null
  fallbackHref: string
  terms: boolean
  children: React.ReactNode
}) {
  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 py-16">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-500">Memuat draft dari server...</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 py-16">
        <p className="text-sm text-red-600">Gagal memuat draft: {error}</p>
        <Link href={fallbackHref} className="text-sm text-blue-600 hover:underline">Mulai pendaftaran dari awal</Link>
      </div>
    )
  }
  if (terms) {
    return <TermsGate>{children}</TermsGate>
  }
  return <>{children}</>
}
