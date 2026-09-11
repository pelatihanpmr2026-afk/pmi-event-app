'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface DraftItem {
  id: string
  namaSekolah: string
  namaPembina: string | null
  currentStep: number
  jumlahPeserta: number
  updatedAt: string
}

const STEP_LABELS: Record<number, string> = {
  1: 'Data Sekolah',
  2: 'Data Peserta',
  3: 'Data Pendamping',
  4: 'Review',
  5: 'Pembayaran',
}

export default function DraftListPage() {
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchDrafts = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : ''
      const res = await fetch(`/api/draft${params}`)
      const json = await res.json()
      if (json.success) setDrafts(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/draft')
        const json = await res.json()
        if (!cancelled && json.success) setDrafts(json.data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchQuery(query)
    void fetchDrafts(query)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">DRAFT PENDAFTARAN</h1>
        <p className="font-body text-xs text-event-navy/60 mt-1">Draft yang disimpan user — lanjutkan pendaftaran atas nama mereka</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          placeholder="Cari nama sekolah..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="outline" size="sm">Cari</Button>
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setQuery(''); setSearchQuery(''); void fetchDrafts('') }}
          >
            Reset
          </Button>
        )}
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : drafts.length === 0 ? (
        <Card pixel>
          <CardContent className="py-12 text-center">
            <p className="font-body text-sm text-gray-400">
              {searchQuery ? `Tidak ada draft untuk "${searchQuery}"` : 'Belum ada draft tersimpan'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Card pixel>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="px-4 py-2 font-heading text-xs">Nama Sekolah</th>
                      <th className="px-4 py-2 font-heading text-xs">Pembina</th>
                      <th className="px-4 py-2 font-heading text-xs">Step</th>
                      <th className="px-4 py-2 font-heading text-xs text-center">Peserta</th>
                      <th className="px-4 py-2 font-heading text-xs">Terakhir Diupdate</th>
                      <th className="px-4 py-2 font-heading text-xs text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((d) => (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 font-body font-medium">{d.namaSekolah}</td>
                        <td className="px-4 py-2 font-body text-gray-600">{d.namaPembina ?? '-'}</td>
                        <td className="px-4 py-2 font-body">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <span className="font-medium">{d.currentStep}</span>
                            <span className="text-gray-400">/ 5</span>
                            <span className="text-gray-400 ml-1">({STEP_LABELS[d.currentStep] ?? '?'})</span>
                          </span>
                        </td>
                        <td className="px-4 py-2 font-body text-center">{d.jumlahPeserta}</td>
                        <td className="px-4 py-2 font-body text-xs text-gray-500">
                          {new Date(d.updatedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link href={`/dashboard/draft/${d.id}`}>
                            <Button variant="outline" size="sm" className="text-xs">
                              Lanjutkan
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {drafts.map((d) => (
              <Card key={d.id} pixel>
                <CardContent className="p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-body font-medium text-sm truncate">{d.namaSekolah}</p>
                      {d.namaPembina && (
                        <p className="font-body text-xs text-gray-500 truncate">{d.namaPembina}</p>
                      )}
                    </div>
                    <Link href={`/dashboard/draft/${d.id}`} className="shrink-0">
                      <Button variant="outline" size="sm" className="text-xs">Lanjutkan</Button>
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Step {d.currentStep}/5</span>
                    <span>{d.jumlahPeserta} peserta</span>
                    <span>{new Date(d.updatedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
