import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { MainStatsCards } from '@/components/dashboard/main-stats-cards'
import { RecentSchools } from '@/components/dashboard/recent-schools'
import { RecentLogs } from '@/components/dashboard/recent-logs'

export const dynamic = 'force-dynamic'

export default async function DashboardHomePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // 1. Ambil Statistik (Semua data)
  const [totalSekolah, totalLunas, totalPeserta, totalPendamping, totalPanitia, financials] = await Promise.all([
    prisma.sekolah.count(),
    prisma.sekolah.count({ where: { pembayaran: { some: { tipe: 'PESERTA', statusPembayaran: 'LUNAS' } } } }),
    prisma.peserta.count({ where: { tipe: 'PESERTA' } }),
    prisma.peserta.count({ where: { tipe: 'PENDAMPING' } }),
    prisma.panitia.count(),
    // Hitung Pemasukan & Pengeluaran sederhana dari tabel keuangan
    prisma.transaksiKeuangan.aggregate({
      _sum: { debit: true, kredit: true },
    }),
  ])

  // 2. Ambil Sekolah Terbaru (5 data)
  const recentSchools = await prisma.sekolah.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      peserta: { select: { tipe: true } },
      pembayaran: { where: { tipe: 'PESERTA' } },
    },
  })

  // 3. Ambil Log Admin Terbaru (15 data)
  const recentLogs = await prisma.adminLog.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' },
    include: { admin: { select: { nama: true, role: true } } },
  })

  // Serialisasi data untuk Client Component
  const serializedSchools = recentSchools.map((s) => ({
    id: s.id,
    namaLengkap: s.namaLengkap,
    kodePendaftaran: s.kodePendaftaran,
    jumlahPeserta: s.peserta.filter((p) => p.tipe === 'PESERTA').length,
    jumlahPendamping: s.peserta.filter((p) => p.tipe === 'PENDAMPING').length,
    statusPembayaran: s.pembayaran[0]?.statusPembayaran ?? 'BELUM_BAYAR',
    createdAt: s.createdAt.toISOString(),
  }))

  const serializedLogs = recentLogs.map((l) => ({
    id: l.id,
    adminName: l.admin?.nama || l.adminName,
    adminRole: l.adminRole || 'UNKNOWN',
    action: l.action,
    targetType: l.targetType || '-',
    targetId: l.targetId,
    metadata: l.metadata as Record<string, unknown> | null,
    ip: l.ip,
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          HALAMAN UTAMA
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Ringkasan statistik pendaftaran, keuangan, dan aktivitas admin terkini.
        </p>
      </div>

      {/* Main Stats Cards */}
      <MainStatsCards
        totalSekolah={totalSekolah}
        totalLunas={totalLunas}
        totalPeserta={totalPeserta}
        totalPendamping={totalPendamping}
        totalPanitia={totalPanitia}
        financials={{
          totalDebit: financials._sum.debit ?? 0,
          totalKredit: financials._sum.kredit ?? 0,
        }}
      />

      {/* Grid 2 Kolom: Pendaftaran Terbaru & Admin Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentSchools initialData={serializedSchools} />
        <RecentLogs initialData={serializedLogs} />
      </div>
    </div>
  )
}