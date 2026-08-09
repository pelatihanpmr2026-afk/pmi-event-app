import Image from 'next/image'
import { PengajuanForm } from '@/components/pengajuan/pengajuan-form'

export default function AjukanAnggaranPage() {
  return (
    <main className="min-h-screen py-10 px-4 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-4">
          <div className="relative w-36 h-20 shrink-0">
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
          PENGAJUAN ANGGARAN
        </h1>
        <p className="font-body text-xs sm:text-sm text-event-navy/70 max-w-md">
          Form pengajuan kebutuhan/barang untuk divisi kepanitiaan
        </p>
      </div>

      <PengajuanForm />
    </main>
  )
}