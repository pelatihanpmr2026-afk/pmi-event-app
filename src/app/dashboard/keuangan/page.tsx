import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { getKeuanganStatsData, getTransaksiListData } from '@/lib/keuangan'
import { KeuanganStats } from '@/components/dashboard/keuangan/keuangan-stats'
import { TransaksiTable } from '@/components/dashboard/keuangan/transaksi-table'
import { DashboardBackground } from '@/components/dashboard/dashboard-background'

export const dynamic = 'force-dynamic'

export default async function DashboardKeuanganPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [stats, transaksi] = await Promise.all([getKeuanganStatsData(), getTransaksiListData()])

  return (
    <div className="relative flex flex-col gap-6 px-4 py-6 md:px-8 lg:px-10">
      <DashboardBackground />
      <div className="relative z-10">
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          KEUANGAN
        </h1>
        <p className="font-body text-xs text-event-navy/60 mt-1">
          Rekap pemasukan, pengeluaran, dan buku kas event
        </p>
      </div>

      <KeuanganStats data={stats} />

      <TransaksiTable initialData={transaksi} />
    </div>
  )
}