'use client'

import { use } from 'react'
import Image from 'next/image'
import { UploadBuktiTransfer } from '@/components/pembayaran/upload-bukti-transfer'
import { DraftPayment } from '@/components/tenda-sewa/draft-payment'

export default function PembayaranTendaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <main className="min-h-screen bg-[var(--color-surface-muted)] py-10 px-4 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-4 justify-center">
          <div className="relative w-28 h-11 shrink-0">
            <Image src="/assets/LogoEvent.png" alt="Logo PMI" fill className="object-contain" />
          </div>
        </div>
        <h1 className="font-heading text-lg sm:text-xl text-event-navy leading-relaxed">
          PEMBAYARAN TENDA
        </h1>
        <p className="font-body text-sm text-gray-500 max-w-md">Transfer biaya sewa tenda sesuai rincian di bawah.</p>
      </div>

      <div className="w-full max-w-md">
        {id.startsWith('resv_') ? <DraftPayment reservationId={id} /> : <UploadBuktiTransfer
          sekolahId={id}
          tipe="tenda"
          title="RINCIAN BIAYA SEWA TENDA"
        />}
      </div>
    </main>
  )
}
