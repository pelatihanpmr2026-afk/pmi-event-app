import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/prisma'
import { SusulanTable } from '@/components/dashboard/susulan/susulan-table'

export const dynamic = 'force-dynamic'

export default async function DashboardSusulanPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const sekolahList = await prisma.sekolah.findMany({
    select: { id: true, namaLengkap: true, kategori: true, nomorPendaftaran: true },
    orderBy: { nomorPendaftaran: 'asc' },
    where: {
      peserta: { some: { batchKe: { gt: 1 } } },
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          DATA SUSULAN
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Sekolah yang memiliki data peserta/pendamping susulan (batch &gt; 1).
        </p>
      </div>
      <SusulanTable sekolahOptions={sekolahList} />
    </div>
  )
}
