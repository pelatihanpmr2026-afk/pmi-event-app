'use client'

import { use } from 'react'
import Image from 'next/image'
import { UploadBuktiTransfer } from '@/components/pembayaran/upload-bukti-transfer'

export default function PembayaranPesertaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-4">
          <div className="relative w-28 h-11 shrink-0">
            <Image src="/assets/logo-pmi.png" alt="Logo PMI" fill className="object-contain" />
          </div>
          <div className="relative w-36 h-20 shrink-0">
            <Image src="/assets/logo-event.png" alt="Logo Event" fill className="object-contain" />
          </div>
        </div>
        <h1 className="font-heading text-lg sm:text-xl text-event-navy leading-relaxed">
          PEMBAYARAN PESERTA
        </h1>
      </div>

      <div className="w-full max-w-md">
        <UploadBuktiTransfer
          sekolahId={id}
          tipe="peserta"
          title="RINCIAN BIAYA PESERTA & PENDAMPING"
        />
      </div>
    </main>
  )
}