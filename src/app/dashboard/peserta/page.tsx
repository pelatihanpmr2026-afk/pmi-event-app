import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { PesertaPendampingDashboard } from '@/components/dashboard/peserta/peserta-pendamping-dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPesertaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const sekolahList = await prisma.sekolah.findMany({
    select: { id: true, namaLengkap: true, kategori: true, nomorPendaftaran: true },
    orderBy: { nomorPendaftaran: 'asc' },
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          DATA PESERTA
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Rekap seluruh peserta (hanya dari pendaftaran yang sudah dikonfirmasi LUNAS).
        </p>
      </div>
      <PesertaPendampingDashboard tipe="PESERTA" sekolahOptions={sekolahList} />
    </div>
  )
}