'use client'

import { use } from 'react'
import Image from 'next/image'
import { UploadBuktiTransfer } from '@/components/pembayaran/upload-bukti-transfer'

export default function PembayaranTendaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

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
          PEMBAYARAN TENDA
        </h1>
      </div>

      <div className="w-full max-w-md">
        <UploadBuktiTransfer sekolahId={id} tipe="tenda" title="RINCIAN BIAYA SEWA TENDA" />
      </div>
    </main>
  )
}