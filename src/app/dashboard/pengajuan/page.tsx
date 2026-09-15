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
      transaksi: { select: { kredit: true } },
    },
  })

  const total = pengajuanList.length
  const menunggu = pengajuanList.filter((p) => p.status === 'MENUNGGU').length
  const disetujui = pengajuanList.filter((p) => p.status === 'DISETUJUI').length
  const ditolak = pengajuanList.filter((p) => p.status === 'DITOLAK').length

  const disetujuiList = pengajuanList.filter((p) => p.status === 'DISETUJUI')
  const totalNominalDisetujui = disetujuiList.reduce((sum, p) => sum + p.totalPengajuan, 0)
  const totalBelanjaDisetujui = disetujuiList.reduce((sum, p) => sum + p.transaksi.reduce((s, t) => s + t.kredit, 0), 0)
  const totalSisaAnggaran = Math.max(totalNominalDisetujui - totalBelanjaDisetujui, 0)

  const divisiAnggaran = new Map<string, { disetujui: number; dicairkan: number }>()
  for (const p of disetujuiList) {
    const current = divisiAnggaran.get(p.divisi) ?? { disetujui: 0, dicairkan: 0 }
    current.disetujui += p.totalPengajuan
    current.dicairkan += p.transaksi.reduce((s, t) => s + t.kredit, 0)
    divisiAnggaran.set(p.divisi, current)
  }
  const divisiBreakdown = [...divisiAnggaran.entries()]
    .map(([divisi, v]) => ({
      divisi,
      disetujui: v.disetujui,
      dicairkan: v.dicairkan,
      sisa: Math.max(v.disetujui - v.dicairkan, 0),
    }))
    .sort((a, b) => b.disetujui - a.disetujui)

  const serializedData = pengajuanList.map(({ transaksi: _, ...p }) => ({
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
        totalBelanjaDisetujui={totalBelanjaDisetujui}
        totalSisaAnggaran={totalSisaAnggaran}
        divisiBreakdown={divisiBreakdown}
      />
      <PengajuanTable initialData={serializedData} />
    </div>
  )
}