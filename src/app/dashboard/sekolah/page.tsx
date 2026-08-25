import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { SekolahStats } from '@/components/dashboard/sekolah-stats'
import { SekolahTable } from '@/components/dashboard/sekolah-table'

export const dynamic = 'force-dynamic'

function pilihPembayaranPeserta<T extends { tipe: string; statusPembayaran: string; batchKe: number; jumlahBiaya: number; statusDaftarUlang: boolean }>(payments: T[]) {
  const peserta = payments.filter((p) => p.tipe === 'PESERTA').sort((a, b) => b.batchKe - a.batchKe)
  return peserta.find((p) => p.statusPembayaran === 'MENUNGGU_KONFIRMASI' || p.statusPembayaran === 'DITOLAK') ?? peserta[0] ?? null
}

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
  const totalPeserta = sekolahList.reduce(
    (sum, s) => sum + s.peserta.filter((p) => p.tipe === 'PESERTA').length,
    0
  )
  const totalPendamping = sekolahList.reduce(
    (sum, s) => sum + s.peserta.filter((p) => p.tipe === 'PENDAMPING').length,
    0
  )
  const menungguKonfirmasi = sekolahList.reduce((sum, s) => {
    const pembayaranPeserta = pilihPembayaranPeserta(s.pembayaran)
    const pembayaranTenda = s.pembayaran.find((p) => p.tipe === 'TENDA')
    let count = 0
    if (pembayaranPeserta?.statusPembayaran === 'MENUNGGU_KONFIRMASI') count++
    if (pembayaranTenda?.statusPembayaran === 'MENUNGGU_KONFIRMASI') count++
    return sum + count
  }, 0)

  const serializedData = sekolahList.map((s) => {
    const jp = s.peserta.filter((p) => p.tipe === 'PESERTA').length
    const jd = s.peserta.filter((p) => p.tipe === 'PENDAMPING').length
    const pembayaranPeserta = pilihPembayaranPeserta(s.pembayaran)
    const pembayaranTenda = s.pembayaran.find((p) => p.tipe === 'TENDA') ?? null

    return {
      id: s.id,
      nomorPendaftaran: s.nomorPendaftaran,
      namaLengkap: s.namaLengkap,
      kodePendaftaran: s.kodePendaftaran,
      jenjang: s.jenjang,
      kategori: s.kategori,
      namaPembina: s.namaPembina,
      jumlahPeserta: jp,
      jumlahPendamping: jd,
      jumlahTenda: s.tendaSewa.reduce((sum, t) => sum + t.jumlah, 0),
      sudahCetak: s.sudahCetak,
      pembayaranPeserta: pembayaranPeserta
        ? {
            id: pembayaranPeserta.id,
            status: pembayaranPeserta.statusPembayaran,
            jumlahBiaya: pembayaranPeserta.jumlahBiaya,
            statusDaftarUlang: pembayaranPeserta.statusDaftarUlang,
            buktiTransferUrl: pembayaranPeserta.buktiTransferUrl,
            kwitansiUrl: pembayaranPeserta.kwitansiUrl,
          }
        : null,
      pembayaranTenda: pembayaranTenda
        ? {
            id: pembayaranTenda.id,
            status: pembayaranTenda.statusPembayaran,
            jumlahBiaya: pembayaranTenda.jumlahBiaya,
            buktiTransferUrl: pembayaranTenda.buktiTransferUrl,
            kwitansiUrl: pembayaranTenda.kwitansiUrl,
          }
        : null,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          DASHBOARD SEKOLAH
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Kelola pendaftaran sekolah, verifikasi pembayaran peserta & tenda.
        </p>
      </div>
      <SekolahStats
        totalSekolah={totalSekolah}
        totalPeserta={totalPeserta}
        totalPendamping={totalPendamping}
        menungguKonfirmasi={menungguKonfirmasi}
      />
      <SekolahTable initialData={serializedData.slice(0, 20)} initialTotal={totalSekolah} role={session.role} />
    </div>
  )
}
