import { prisma } from '@/lib/prisma'
import { PixelPageShell } from '@/components/public/pixel-page-shell'
import { TendaInfoCards } from '@/components/public/tenda-info-cards'
import { HomeNavbar } from '@/components/home/home-navbar'

export const dynamic = 'force-dynamic'

export default async function InformasiTendaPage() {
  const tendaList = await prisma.tendaJenis.findMany({
    orderBy: { kapasitasMin: 'asc' },
    select: {
      id: true,
      nama: true,
      gambarUrl: true,
      kapasitasMin: true,
      kapasitasMax: true,
      harga: true,
      stokTotal: true,
    },
  })

  return (
    <>
      <HomeNavbar />
      <PixelPageShell
        title="INFORMASI SEWA TENDA"
        subtitle="Kenali pilihan tenda, kapasitas, dan harga sebelum melakukan pemesanan."
        marqueeItems={['INFORMASI TENDA', 'KAPASITAS', 'HARGA SEWA', 'SIAP BERKEMAH']}
        marqueeVariant="blue"
        contentClassName="max-w-4xl"
      >
        <TendaInfoCards tendaList={tendaList} section={false} />
      </PixelPageShell>
    </>
  )
}
