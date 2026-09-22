import Image from 'next/image'
import { SertifikatPembinaForm } from '@/components/sertifikat/sertifikat-pembina-form'

export default function SertifikatPembinaPage() {
  return (
    <main className="min-h-screen bg-[var(--color-surface-muted)] py-10 px-4 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative w-76 h-60 sm:w-104 sm:h-[200px] shrink-0">
          <Image src="/assets/LogoEvent.png" alt="Logo Event" fill className="object-contain" priority />
        </div>
        <h1 className="font-heading text-lg sm:text-xl text-event-navy leading-relaxed">
          UNDUH SERTIFIKAT PEMBINA
        </h1>
        <p className="font-body text-sm text-gray-500 max-w-md">
          Cari sertifikat Pembina PMR berdasarkan nama pembina dan nama sekolah,
          lalu unduh dalam format PDF.
        </p>
      </div>

      <SertifikatPembinaForm />
    </main>
  )
}
