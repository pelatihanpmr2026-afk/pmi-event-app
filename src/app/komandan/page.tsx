import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { KomandanMainStatsCards } from '@/components/komandan/komandan-main-stats-cards'
import { RecentSchools } from '@/components/dashboard/recent-schools'

export const dynamic = 'force-dynamic'

export default async function KomandanHomePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const lunasWhere = { pembayaran: { some: { tipe: 'PESERTA' as const, statusPembayaran: 'LUNAS' as const } } }

  const [totalSekolah, totalLunas, totalPeserta, totalPendamping] = await Promise.all([
    prisma.sekolah.count(),
    prisma.sekolah.count({ where: lunasWhere }),
    prisma.peserta.count({ where: { tipe: 'PESERTA', sekolah: lunasWhere } }),
    prisma.peserta.count({ where: { tipe: 'PENDAMPING', sekolah: lunasWhere } }),
  ])

  const recentSchools = await prisma.sekolah.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      peserta: { select: { tipe: true } },
      pembayaran: { where: { tipe: 'PESERTA' } },
    },
  })

  const serializedSchools = recentSchools.map((s) => ({
    id: s.id,
    namaLengkap: s.namaLengkap,
    kodePendaftaran: s.kodePendaftaran,
    jumlahPeserta: s.peserta.filter((p) => p.tipe === 'PESERTA').length,
    jumlahPendamping: s.peserta.filter((p) => p.tipe === 'PENDAMPING').length,
    statusPembayaran: s.pembayaran[0]?.statusPembayaran ?? 'BELUM_BAYAR',
    createdAt: s.createdAt.toISOString(),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          HALAMAN KOMANDAN
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Ringkasan statistik pendaftaran (tampilan terbatas).
        </p>
      </div>

      <KomandanMainStatsCards
        totalSekolah={totalSekolah}
        totalLunas={totalLunas}
        totalPeserta={totalPeserta}
        totalPendamping={totalPendamping}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentSchools initialData={serializedSchools} />
      </div>
    </div>
  )
}
