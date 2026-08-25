import { use } from 'react'
import Image from 'next/image'
import { SusulanRegistrationForm } from '@/components/sekolah/susulan/susulan-registration-form'

export default function SusulanFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <main className="min-h-screen bg-[var(--color-surface-muted)] py-10 px-4 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative w-76 h-60 sm:w-104 sm:h-[200px] shrink-0">
          <Image src="/assets/LogoEvent.png" alt="Logo Event" fill className="object-contain" priority />
        </div>
        <h1 className="font-heading text-lg sm:text-xl text-event-navy leading-relaxed">
          DATA PESERTA/PENDAMPING SUSULAN
        </h1>
      </div>

      <SusulanRegistrationForm sekolahId={id} />
    </main>
  )
}