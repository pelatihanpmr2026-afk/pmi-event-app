import { RegistrationForm } from '@/components/panitia/registration-form'
import Image from 'next/image'

export default function DaftarPanitiaPage() {
  return (
    <main className="min-h-screen py-10 px-4 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-4">
          <div className="relative w-76 h-60 sm:w-104 sm:h-[200px] shrink-0">
            <Image
              src="/assets/LogoEvent.png"
              alt="Logo Event"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <h1 className="font-heading text-lg sm:text-xl text-event-navy leading-relaxed">
          PENDAFTARAN PANITIA
        </h1>
        <p className="font-body text-xs sm:text-sm text-event-navy/70 max-w-md">
          Pelantikan & Pelatihan PMR Se-Kabupaten Cianjur 2026
        </p>
      </div>

      <RegistrationForm />
    </main>
  )
}