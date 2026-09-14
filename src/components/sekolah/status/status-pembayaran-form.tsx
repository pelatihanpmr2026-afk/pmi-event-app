'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { VerifikasiSekolahForm } from '@/components/verifikasi-sekolah-form'

export function StatusPembayaranForm() {
  const router = useRouter()

  return (
    <div className="w-full max-w-md mx-auto">
      <VerifikasiSekolahForm
        title="VERIFIKASI KEPEMILIKAN SEKOLAH"
        description="Masukkan No. WhatsApp Pembina yang terdaftar untuk melihat status pembayaran, nomor pendaftaran, dan mengunduh kwitansi. Kalau nomor ini terdaftar di beberapa sekolah, kamu bisa memilih sekolah yang dituju."
        endpoint="/api/sekolah/pembayaran/lookup"
        method="GET"
        selectEndpoint="/api/sekolah/pembayaran/select"
        onSuccess={(data) => {
          toast.success(`Sekolah ditemukan: ${String(data.namaLengkap)}`)
          router.push(`/sekolah/pembayaran/${String(data.sekolahId)}`)
        }}
      />
    </div>
  )
}