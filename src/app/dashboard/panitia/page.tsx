import { prisma } from '@/lib/prisma'
import { PanitiaStats } from '@/components/dashboard/panitia-stats'
import { PanitiaTable } from '@/components/dashboard/panitia-table'
import { DivisiCapacityCard } from '@/components/dashboard/divisi-capacity-card'
import { DIVISI_CAPACITY } from '@/lib/constants'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPanitiaPage() {
  const [panitiaList, sesiList] = await Promise.all([
    prisma.panitia.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        absensiLogs: {
          select: { sesiId: true, scannedAt: true },
        },
      },
    }),
    prisma.absensiSesi.findMany({
      orderBy: { tanggal: 'asc' },
    }),
  ])

  const total = panitiaList.length
  const perUnit: Record<string, number> = {}
  const perDivisi: Record<string, number> = {}
  for (const p of panitiaList) {
    perUnit[p.asalUnit] = (perUnit[p.asalUnit] ?? 0) + 1
    perDivisi[p.divisi] = (perDivisi[p.divisi] ?? 0) + 1
  }

  const divisiCounts = Object.entries(perDivisi).map(([divisi, count]) => ({ divisi, count }))

  const serializedData = panitiaList.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    absensiLogs: p.absensiLogs.map((log) => ({
      sesiId: log.sesiId,
      scannedAt: log.scannedAt.toISOString(),
    })),
  }))

  const serializedSesi = sesiList.map((s) => ({
    id: s.id,
    nama: s.nama,
    tanggal: s.tanggal.toISOString(),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
            DASHBOARD PANITIA
          </h1>
          <p className="font-body text-xs text-event-navy/60 mt-1">
            Kelola data pendaftaran panitia event
          </p>
        </div>
        <Link href="/panitia/daftar">
          <Button className="bg-event-yellow text-event-navy flex items-center gap-2">
            <UserPlus size={16} />
            Daftar Panitia Baru
          </Button>
        </Link>
      </div>

      <PanitiaStats total={total} perUnit={perUnit} />

      <DivisiCapacityCard counts={divisiCounts} capacityMap={DIVISI_CAPACITY} />

      <PanitiaTable initialData={serializedData} sesiList={serializedSesi} />
    </div>
  )
}