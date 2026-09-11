'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SekolahRegistrationForm } from '@/components/sekolah/registration-form'

export default function DraftContinuePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void params.then((p) => { if (!cancelled) setId(p.id) })
    return () => { cancelled = true }
  }, [params])

  if (!id) {
    return (
      <div className="w-full flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">LANJUTKAN DRAFT</h1>
        <p className="font-body text-xs text-event-navy/60 mt-1">Menyelesaikan pendaftaran atas nama sekolah ini</p>
      </div>

      <SekolahRegistrationForm
        adminDraftId={id}
        onDone={() => {
          router.push('/dashboard/draft')
        }}
      />
    </div>
  )
}