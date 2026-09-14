import { PixelPageShell } from '@/components/public/pixel-page-shell'
import { SekolahRegistrationForm } from '@/components/sekolah/registration-form'

const MARQUEE_ITEMS = ['PENDAFTARAN SEKOLAH', 'WIRA & MADYA', 'KUOTA TERBATAS', 'DAFTAR SEKARANG']

// Mode resume: panitia membagikan link /sekolah/daftar?draft=<id>&token=<token>
// ke pembina sekolah. Form akan memuat draft server & melanjutkan pendaftaran
// tanpa login admin, dengan akses dikunci token acak (bukan session).
export default async function DaftarSekolahPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; token?: string }>
}) {
  const { draft, token } = await searchParams

  return (
    <PixelPageShell
      title="PENDAFTARAN SEKOLAH"
      subtitle="Pelantikan & Pelatihan PMR Se-Kabupaten Cianjur 2026"
      marqueeItems={MARQUEE_ITEMS}
      marqueeVariant="pink"
      contentClassName="max-w-6xl"
    >
      <SekolahRegistrationForm resumeDraftId={draft} resumeToken={token} />
    </PixelPageShell>
  )
}