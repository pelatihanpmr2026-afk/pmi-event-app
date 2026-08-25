import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { getKeuanganStatsData, getTransaksiListData } from '@/lib/keuangan'
import { KeuanganStats } from '@/components/dashboard/keuangan/keuangan-stats'
import { TransaksiTable } from '@/components/dashboard/keuangan/transaksi-table'
import { RekonsiliasiPanel } from '@/components/dashboard/keuangan/rekonsiliasi-panel'

export const dynamic = 'force-dynamic'

export default async function DashboardKeuanganPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [stats, transaksi] = await Promise.all([getKeuanganStatsData(), getTransaksiListData()])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          KEUANGAN
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Rekap pemasukan, pengeluaran, dan buku kas event.
        </p>
      </div>
      <KeuanganStats data={stats} />
      <RekonsiliasiPanel />
      <TransaksiTable initialData={transaksi} />
    </div>
  )
}