'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table'

interface LogRow {
  id: string
  adminName: string
  adminRole: string | null
  action: string
  targetType: string | null
  targetId: string | null
  metadata: Record<string, unknown> | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export function AdminLogsTable({ initialLogs }: { initialLogs: LogRow[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return initialLogs.filter((log) => {
      const q = search.toLowerCase()
      return (
        log.adminName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.targetType?.toLowerCase() || '').includes(q)
      )
    })
  }, [initialLogs, search])

  const columns: ResponsiveTableColumn<LogRow>[] = [
    {
      key: 'waktu',
      header: 'Waktu',
      width: '160px',
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.createdAt).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: 'admin',
      header: 'Admin',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.adminName}</span>
          <span className="text-xs text-gray-400">{row.adminRole}</span>
        </div>
      ),
    },
    {
      key: 'aksi',
      header: 'Aksi',
      width: '160px',
      render: (row) => {
        let variant: 'default' | 'warning' | 'danger' = 'default'
        if (row.action.includes('LOGIN')) variant = 'default'
        else if (row.action.includes('KONFIRMASI')) variant = 'default'
        else if (row.action.includes('HAPUS') || row.action.includes('TOLAK')) variant = 'danger'
        return <Badge variant={variant}>{row.action}</Badge>
      },
    },
    {
      key: 'target',
      header: 'Target',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-500">{row.targetType || '-'}</span>
          {row.targetId && <span className="text-xs text-gray-400">{row.targetId}</span>}
        </div>
      ),
    },
    {
      key: 'detail',
      header: 'Detail / Metadata',
      width: '220px',
      render: (row) => {
        if (!row.metadata) return <span className="text-gray-400">-</span>
        try {
          return (
            <pre className="text-xs bg-[var(--color-surface-muted)] p-2 rounded-[var(--radius-input)] overflow-x-auto whitespace-pre-wrap max-h-24">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          )
        } catch {
          return <span className="text-xs text-pmi-red">Error parsing metadata</span>
        }
      },
    },
    {
      key: 'ip',
      header: 'IP',
      width: '120px',
      render: (row) => (
        <span className="text-xs text-gray-400 font-mono">
          {row.ip || '-'}
        </span>
      ),
      hideOnMobile: true,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Cari nama admin, aksi, atau target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] bg-white py-12 flex flex-col items-center justify-center gap-2">
          <Search size={24} className="text-gray-300" />
          <p className="font-body text-sm text-gray-400">Tidak ada log yang ditemukan</p>
        </div>
      ) : (
        <ResponsiveTable columns={columns} data={filtered} />
      )}

      <p className="font-body text-xs text-gray-400">
        Menampilkan {filtered.length} dari {initialLogs.length} log terbaru
      </p>
    </div>
  )
}