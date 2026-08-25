import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { AdminLogsTable } from '@/components/dashboard/admin-logs/admin-logs-table'
import { isPathAllowedForRole } from '@/lib/admin-role'

export const dynamic = 'force-dynamic'

export default async function AdminLogsPage() {
  const session = await getSession()
  if (!session || !isPathAllowedForRole(session.role, '/dashboard/admin-logs')) {
    redirect('/dashboard/panitia')
  }

  const logs = await prisma.adminLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500, // Batasi jumlah log untuk performa
    include: { admin: true },
  })

  const serializedLogs = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    metadata: log.metadata as Record<string, unknown> | null,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          LOG AKTIVITAS ADMIN
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Pantau semua perubahan yang dilakukan oleh admin di sistem.
        </p>
      </div>
      <AdminLogsTable initialLogs={serializedLogs} />
    </div>
  )
}