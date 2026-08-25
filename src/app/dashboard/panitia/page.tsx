import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { PanitiaStats } from '@/components/dashboard/panitia/panitia-stats'
import { PanitiaTable } from '@/components/dashboard/panitia/panitia-table'

export const dynamic = 'force-dynamic'

export default async function DashboardPanitiaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // 1. Ambil data panitia beserta logs absensinya
  const panitiaList = await prisma.panitia.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      absensiLogs: {
        select: {
          sesiId: true,
          scannedAt: true,
        },
      },
    },
  })

  // 2. Ambil daftar sesi absensi (untuk keperluan modal detail panitia)
  const sesiList = await prisma.absensiSesi.findMany({
    orderBy: { tanggal: 'asc' },
    select: {
      id: true,
      nama: true,
      tanggal: true,
    },
  })

  const total = panitiaList.length
  const perUnit: Record<string, number> = {}
  for (const p of panitiaList) {
    perUnit[p.asalUnit] = (perUnit[p.asalUnit] ?? 0) + 1
  }

  // 3. Serialisasi data agar bisa dikirim ke Client Component
  const serializedData = panitiaList.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    // Prisma Date objects harus diubah ke string untuk dikirim ke client
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
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          DASHBOARD PANITIA
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Kelola data pendaftaran panitia event.
        </p>
      </div>
      <PanitiaStats total={total} perUnit={perUnit} />
      {/* Kirim sesiList juga ke PanitiaTable */}
      <PanitiaTable initialData={serializedData} sesiList={serializedSesi} />
    </div>
  )
}