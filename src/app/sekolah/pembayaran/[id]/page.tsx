'use client'

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { UploadBuktiTransfer } from '@/components/pembayaran/upload-bukti-transfer'

export default function PembayaranPesertaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  // Dari alur susulan, link mengarah ke sini dengan ?pembayaranId=... supaya
  // halaman ini menunjukkan batch susulan yang baru saja disubmit, bukan
  // "menebak" batch mana yang relevan (sekolah bisa punya >1 baris Pembayaran
  // tipe PESERTA sekarang). Link lama (tanpa query, dari sebelum ada fitur
  // susulan) tetap jalan — endpoint akan fallback ke batch yang paling
  // butuh perhatian.
  const searchParams = useSearchParams()
  const pembayaranId = searchParams.get('pembayaranId')

  return (
    <main className="min-h-screen bg-[var(--color-surface-muted)] py-10 px-4 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-4 justify-center">
          <div className="relative w-28 h-11 shrink-0">
            <Image src="/assets/LogoEvent.png" alt="Logo PMI" fill className="object-contain" />
          </div>
        </div>
        <h1 className="font-heading text-lg sm:text-xl text-event-navy leading-relaxed">
          PEMBAYARAN PESERTA
        </h1>
        <p className="font-body text-sm text-gray-500 max-w-md">Transfer biaya pendaftaran sesuai rincian di bawah.</p>
      </div>

      <div className="w-full max-w-md">
        <UploadBuktiTransfer
          sekolahId={id}
          tipe="peserta"
          title="RINCIAN BIAYA PESERTA & PENDAMPING"
          pembayaranId={pembayaranId ?? undefined}
        />
      </div>
    </main>
  )
}