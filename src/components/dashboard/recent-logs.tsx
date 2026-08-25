'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'

interface LogRow {
  id: string
  adminName: string
  adminRole: string
  action: string
  targetType: string
  targetId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export function RecentLogs({ initialData }: { initialData: LogRow[] }) {
  const logs = useMemo(() => initialData.slice(0, 10), [initialData])

  if (logs.length === 0) {
    return (
      <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white p-6 text-center">
        <p className="font-body text-sm text-gray-400">Belum ada aktivitas admin tercatat.</p>
      </div>
    )
  }

  const columns: ResponsiveTableColumn<LogRow>[] = [
    {
      key: 'admin',
      header: 'Admin',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-event-navy">{row.adminName}</span>
          <span className="text-xs text-gray-400">{row.adminRole}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (row) => {
        let variant: 'default' | 'warning' | 'danger' = 'default'
        if (row.action.includes('LOGIN')) variant = 'default'
        else if (row.action.includes('KONFIRMASI_LUNAS') || row.action.includes('SETUJUI')) variant = 'default'
        else if (row.action.includes('HAPUS') || row.action.includes('TOLAK')) variant = 'danger'
        return <Badge variant={variant}>{row.action}</Badge>
      },
    },
    {
      key: 'target',
      header: 'Target / Objek',
      width: '200px',
      render: (row) => {
        // FIX: pastikan targetName benar-benar string sebelum di-render
        const targetName = typeof row.metadata?.targetName === 'string' ? row.metadata.targetName : '-'
        return (
          <span className="text-gray-600 text-sm block truncate max-w-[180px]" title={targetName}>
            {targetName}
          </span>
        )
      },
    },
    {
      key: 'waktu',
      header: 'Waktu',
      width: '140px',
      render: (row) => (
        <span className="text-xs text-gray-400">
          {new Date(row.createdAt).toLocaleString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
  ]

  return (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
        <h2 className="font-heading text-xs text-event-navy">Log Aktivitas Admin</h2>
        <span className="font-body text-xs text-gray-400">{initialData.length} total log</span>
      </div>

      {logs.length > 0 ? (
        <div className="p-0">
          <ResponsiveTable columns={columns} data={logs} />
        </div>
      ) : null}
    </div>
  )
}