'use client'

import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

export interface ResponsiveTableColumn<T> {
  key: string
  header: string
  align?: 'left' | 'center' | 'right'
  width?: string
  sortable?: boolean
  render: (row: T) => ReactNode
  // Kolom yang TIDAK ditampilkan di kartu mobile (misal kolom yang cuma relevan di layar lebar)
  hideOnMobile?: boolean
}

export function ResponsiveTable<T extends { id: string }>({
  columns,
  data,
  emptyMessage = 'Tidak ada data',
  renderMobileCard,
  sortKey,
  sortDir,
  onSort,
}: {
  columns: ResponsiveTableColumn<T>[]
  data: T[]
  emptyMessage?: string
  // Kalau tidak dikasih, mobile fallback otomatis pakai kolom yang bukan hideOnMobile
  renderMobileCard?: (row: T) => ReactNode
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
}) {
  if (data.length === 0) {
    return (
      <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] bg-white py-12 text-center">
        <p className="font-body text-sm text-gray-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      {/* MOBILE: Card list */}
      <div className="md:hidden flex flex-col gap-3">
        {data.map((row) =>
          renderMobileCard ? (
            <div key={row.id}>{renderMobileCard(row)}</div>
          ) : (
            <div
              key={row.id}
              className="border border-[var(--color-border)] rounded-[var(--radius-card)] bg-white p-4 flex flex-col gap-2 shadow-[var(--shadow-soft)]"
            >
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3">
                    <span className="font-body text-xs text-gray-400 shrink-0">{col.header}</span>
                    <span className="font-body text-sm text-event-navy text-right">{col.render(row)}</span>
                  </div>
                ))}
            </div>
          )
        )}
      </div>

      {/* DESKTOP: Table */}
      <div className="hidden md:block border border-[var(--color-border)] rounded-[var(--radius-card)] bg-white overflow-visible shadow-[var(--shadow-soft)]">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-surface-muted)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`font-body text-xs font-semibold text-gray-500 px-4 py-3 ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-event-navy transition-colors ${
                        sortKey === col.key ? 'text-event-navy' : ''
                      } ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        )
                      ) : (
                        <ArrowUpDown size={12} className="text-gray-300" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id}
                className={`relative border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-colors ${
                  i % 2 === 1 ? 'bg-[var(--color-surface-muted)]/40' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`relative px-4 py-3 font-body text-sm text-event-navy ${
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
