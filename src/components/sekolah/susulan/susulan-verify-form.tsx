'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { VerifikasiSekolahForm } from '@/components/verifikasi-sekolah-form'

export function SusulanVerifyForm() {
  const router = useRouter()

  return (
    <div className="w-full max-w-md mx-auto">
      <VerifikasiSekolahForm
        title="VERIFIKASI KEPEMILIKAN SEKOLAH"
        description="Masukkan No. WhatsApp Pembina yang terdaftar. Kalau nomor ini terdaftar di beberapa sekolah, kamu bisa memilih sekolah yang ingin didaftarkan susulan."
        endpoint="/api/sekolah/susulan/verify"
        method="GET"
        selectEndpoint="/api/sekolah/susulan/select"
        onSuccess={(data) => {
          toast.success(`Sekolah ditemukan: ${String(data.namaLengkap)}`)
          router.push(`/sekolah/susulan/${String(data.sekolahId)}`)
        }}
      />
    </div>
  )
}