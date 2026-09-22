import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { PembinaTable } from '@/components/dashboard/pembina-table'

export const dynamic = 'force-dynamic'

export default async function DashboardPembinaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          DATA PEMBINA
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Kelola data pembina PMR dan generate sertifikat pelantikan.
        </p>
      </div>
      <PembinaTable />
    </div>
  )
}
