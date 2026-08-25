import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { PengajuanStats } from '@/components/dashboard/pengajuan/pengajuan-stats'
import { PengajuanTable } from '@/components/dashboard/pengajuan/pengajuan-table'

export const dynamic = 'force-dynamic'

export default async function DashboardPengajuanPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const pengajuanList = await prisma.pengajuanAnggaran.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nomorPengajuan: true,
      namaKoordinator: true,
      divisi: true,
      noHp: true,
      totalJenisBarang: true,
      totalKuantitas: true,
      totalPengajuan: true,
      status: true,
      createdAt: true,
    },
  })

  const total = pengajuanList.length
  const menunggu = pengajuanList.filter((p) => p.status === 'MENUNGGU').length
  const disetujui = pengajuanList.filter((p) => p.status === 'DISETUJUI').length
  const ditolak = pengajuanList.filter((p) => p.status === 'DITOLAK').length
  const totalNominalDisetujui = pengajuanList
    .filter((p) => p.status === 'DISETUJUI')
    .reduce((sum, p) => sum + p.totalPengajuan, 0)

  const serializedData = pengajuanList.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          PENGAJUAN ANGGARAN
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Kelola pengajuan kebutuhan/barang dari setiap divisi.
        </p>
      </div>
      <PengajuanStats
        total={total}
        menunggu={menunggu}
        disetujui={disetujui}
        ditolak={ditolak}
        totalNominalDisetujui={totalNominalDisetujui}
      />
      <PengajuanTable initialData={serializedData} />
    </div>
  )
}