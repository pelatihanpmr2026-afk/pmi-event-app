'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { STATUS_PEMBAYARAN_CONFIG } from '@/lib/constants-sekolah'

interface SchoolRow {
  id: string
  namaLengkap: string
  kodePendaftaran: string
  jumlahPeserta: number
  jumlahPendamping: number
  statusPembayaran: string
  createdAt: string
}

export function RecentSchools({ initialData }: { initialData: SchoolRow[] }) {
  const router = useRouter()

  if (initialData.length === 0) {
    return (
      <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-6 text-center">
        <p className="font-body text-sm text-gray-400">Belum ada pendaftaran sekolah.</p>
      </div>
    )
  }

  const config = STATUS_PEMBAYARAN_CONFIG

  return (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
        <h2 className="font-heading text-xs text-event-navy">Pendaftaran Terbaru</h2>
        <button
          onClick={() => router.push('/dashboard/sekolah')}
          className="font-body text-xs text-event-blue hover:underline"
        >
          Lihat Semua
        </button>
      </div>
      <div className="flex flex-col">
        {initialData.map((s, i) => {
          const badgeConfig = config[s.statusPembayaran as keyof typeof config]
          return (
            <div
              key={s.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer`}
              onClick={() => router.push(`/dashboard/sekolah`)}
            >
              <div className="min-w-0 flex-1">
                <p className="font-body font-semibold text-event-navy truncate">{s.namaLengkap}</p>
                <p className="font-body text-xs text-gray-400">{s.kodePendaftaran}</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0 text-xs">
                <span className="text-gray-500 hidden sm:inline">
                  {s.jumlahPeserta} peserta · {s.jumlahPendamping} pendamping
                </span>
                {/* FIX: ganti 'as any' menjadi type assertion yang valid */}
                <Badge variant={badgeConfig.variant as 'success' | 'warning' | 'info' | 'default' | 'danger'}>
                  {badgeConfig.label}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}