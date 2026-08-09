import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { PesertaPendampingDashboard } from '@/components/dashboard/peserta/peserta-pendamping-dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPendampingPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const sekolahList = await prisma.sekolah.findMany({
    select: { id: true, namaLengkap: true, kategori: true, nomorPendaftaran: true },
    orderBy: { nomorPendaftaran: 'asc' },
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">DATA PENDAMPING</h1>
        <p className="font-body text-xs text-event-navy/60 mt-1">Rekap seluruh pendamping dari semua sekolah</p>
      </div>
      <PesertaPendampingDashboard tipe="PENDAMPING" sekolahOptions={sekolahList} />
    </div>
  )
}