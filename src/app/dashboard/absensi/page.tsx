import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { SesiManager } from '@/components/dashboard/absensi/sesi-manager'
import { ScannerPanel } from '@/components/dashboard/absensi/scanner-panel'

export const dynamic = 'force-dynamic'

export default async function DashboardAbsensiPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const sesiList = await prisma.absensiSesi.findMany({
    orderBy: { tanggal: 'asc' },
    include: { _count: { select: { logs: true } } },
  })

  const serializedSesi = sesiList.map((s) => ({
    ...s,
    tanggal: s.tanggal.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          DASHBOARD ABSENSI
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Atur jadwal sesi dan scan QR Code untuk absensi panitia.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScannerPanel />
        <SesiManager initialSesi={serializedSesi} />
      </div>
    </div>
  )
}