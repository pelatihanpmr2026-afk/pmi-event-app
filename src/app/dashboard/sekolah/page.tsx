import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { SekolahStats } from '@/components/dashboard/sekolah-stats'
import { SekolahTable } from '@/components/dashboard/sekolah-table'
import { DashboardBackground } from '@/components/dashboard/dashboard-background'

export const dynamic = 'force-dynamic'

export default async function DashboardSekolahPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const sekolahList = await prisma.sekolah.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      peserta: { select: { tipe: true } },
      tendaSewa: { select: { jumlah: true } },
      pembayaran: true,
    },
  })

  const totalSekolah = sekolahList.length

  const serializedData = sekolahList.map((s) => {
    const jp = s.peserta.filter((p) => p.tipe === 'PESERTA').length
    const jd = s.peserta.filter((p) => p.tipe === 'PENDAMPING').length

    const pembayaranPeserta = s.pembayaran.find((p) => p.tipe === 'PESERTA') ?? null
    const pembayaranTenda = s.pembayaran.find((p) => p.tipe === 'TENDA') ?? null

    const menungguPeserta = pembayaranPeserta?.statusPembayaran === 'MENUNGGU_KONFIRMASI' ? 1 : 0
    const menungguTenda = pembayaranTenda?.statusPembayaran === 'MENUNGGU_KONFIRMASI' ? 1 : 0

    return {
      id: s.id,
      namaLengkap: s.namaLengkap,
      kodePendaftaran: s.kodePendaftaran,
      jenjang: s.jenjang,
      kategori: s.kategori,
      namaPembina: s.namaPembina,
      jumlahPeserta: jp,
      jumlahPendamping: jd,
      jumlahTenda: s.tendaSewa.reduce((sum, t) => sum + t.jumlah, 0),
      pembayaranPeserta: pembayaranPeserta
        ? { status: pembayaranPeserta.statusPembayaran, jumlahBiaya: pembayaranPeserta.jumlahBiaya }
        : null,
      pembayaranTenda: pembayaranTenda
        ? { status: pembayaranTenda.statusPembayaran, jumlahBiaya: pembayaranTenda.jumlahBiaya }
        : null,
      _menungguCount: menungguPeserta + menungguTenda,
    }
  })

  const totalPeserta = serializedData.reduce((sum, s) => sum + s.jumlahPeserta, 0)
  const totalPendamping = serializedData.reduce((sum, s) => sum + s.jumlahPendamping, 0)
  const menungguKonfirmasi = serializedData.reduce((sum, s) => sum + s._menungguCount, 0)

  const cleanedData = serializedData.map(({ _menungguCount, ...rest }) => rest)

  return (
    <div className="relative flex flex-col gap-8 px-4 py-6 md:px-8 lg:px-10">
      <DashboardBackground />

      {/* Header */}
      <div className="relative z-10 space-y-2">
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-event-navy leading-tight tracking-tight">
          DASHBOARD <span className="text-event-pink">SEKOLAH</span>
        </h1>
        <p className="font-body text-sm sm:text-base text-event-navy/70">
          Kelola pendaftaran sekolah, verifikasi pembayaran peserta &amp; tenda
        </p>
      </div>

      {/* Stats Cards (client component with animated counters) */}
      <SekolahStats
        totalSekolah={totalSekolah}
        totalPeserta={totalPeserta}
        totalPendamping={totalPendamping}
        menungguKonfirmasi={menungguKonfirmasi}
      />

      {/* Table (client component with search/filter & animations) */}
      <SekolahTable initialData={cleanedData} />

      <div className="h-8" />
    </div>
  )
}