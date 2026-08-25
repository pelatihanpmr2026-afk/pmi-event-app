import { redirect } from 'next/navigation'
import { getSession } from '@/lib/get-session'
import { DaftarUlangScannerPanel } from '@/components/dashboard/daftar-ulang/scanner-panel'

export default async function DaftarUlangPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          DAFTAR ULANG SEKOLAH
        </h1>
        <p className="font-body text-xs text-[var(--color-text-muted)] mt-1">
          Scan QR Code pada kwitansi peserta untuk konfirmasi kehadiran hari-H.
        </p>
      </div>
      <div className="max-w-xl">
        <DaftarUlangScannerPanel />
      </div>
    </div>
  )
}