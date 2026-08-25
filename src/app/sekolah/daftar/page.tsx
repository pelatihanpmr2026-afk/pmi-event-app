import { PixelPageShell } from '@/components/public/pixel-page-shell'
import { SekolahRegistrationForm } from '@/components/sekolah/registration-form'

const MARQUEE_ITEMS = ['PENDAFTARAN SEKOLAH', 'WIRA & MADYA', 'KUOTA TERBATAS', 'DAFTAR SEKARANG']

export default function DaftarSekolahPage() {
  return (
    <PixelPageShell
      title="PENDAFTARAN SEKOLAH"
      subtitle="Pelantikan & Pelatihan PMR Se-Kabupaten Cianjur 2026"
      marqueeItems={MARQUEE_ITEMS}
      marqueeVariant="pink"
      contentClassName="max-w-6xl"
    >
      <SekolahRegistrationForm />
    </PixelPageShell>
  )
}