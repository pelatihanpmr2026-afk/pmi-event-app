import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { canConfirmPembayaran } from '@/lib/admin-role'
import { AntrianKonfirmasi } from '@/components/dashboard/keuangan/antrian-konfirmasi'

export const dynamic = 'force-dynamic'

export default async function AntrianPembayaranPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!canConfirmPembayaran(session.role)) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          ANTRIAN PEMBAYARAN
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Konfirmasi pembayaran pendaftaran dan tenda yang sedang menunggu.
        </p>
      </div>
      <AntrianKonfirmasi />
    </div>
  )
}