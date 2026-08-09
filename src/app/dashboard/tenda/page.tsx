import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { TendaManager, type TendaData } from '@/components/dashboard/tenda/tenda-manager'

export const dynamic = 'force-dynamic'

export default async function DashboardTendaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const tendaList = await prisma.tendaJenis.findMany({ orderBy: { kapasitasMin: 'asc' } })

  const allSewa = await prisma.tendaSewa.findMany({
    select: {
      tendaJenisId: true,
      jumlah: true,
      sekolah: {
        select: { pembayaran: { where: { tipe: 'TENDA' }, select: { statusPembayaran: true } } },
      },
    },
  })

  const terpakaiMap: Record<string, number> = {}
  for (const sewa of allSewa) {
    const status = sewa.sekolah.pembayaran[0]?.statusPembayaran
    if (status === 'DITOLAK') continue
    terpakaiMap[sewa.tendaJenisId] = (terpakaiMap[sewa.tendaJenisId] ?? 0) + sewa.jumlah
  }

const data: TendaData[] = tendaList.map((t) => ({
  id: t.id,
  nama: t.nama,
  kapasitasMin: t.kapasitasMin,
  kapasitasMax: t.kapasitasMax,
  harga: t.harga,
  hargaVendor: t.hargaVendor,
  stokTotal: t.stokTotal,
  stokTersisa: Math.max(t.stokTotal - (terpakaiMap[t.id] ?? 0), 0),
}))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          KELOLA TENDA
        </h1>
        <p className="font-body text-xs text-event-navy/60 mt-1">
          Atur jenis, harga, dan stok tenda yang bisa disewa
        </p>
      </div>

      <TendaManager initialTenda={data} />
    </div>
  )
}