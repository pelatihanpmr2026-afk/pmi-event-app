'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface SekolahSearchResult {
  id: string
  namaLengkap: string
  kategori: string
  kodePendaftaran: string
  jumlahPeserta: number
  estimasiPesertaPendamping: number | null
  tendaTerkunci: boolean
}

export function CariSekolah({ onSelect }: { onSelect: (sekolah: SekolahSearchResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SekolahSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

 useEffect(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current)

  if (query.trim().length < 2) {
    return
  }

  debounceRef.current = setTimeout(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/sekolah/search?q=${encodeURIComponent(query.trim())}`)
      const result = await res.json()
      if (result.success) setResults(result.data)
      else setResults([])
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, 400)

  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }
}, [query])

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Cari Nama Sekolah"
        placeholder="Ketik minimal 2 huruf, misal: SMAN 1"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading && (
        <div className="flex items-center gap-2 justify-center py-3">
          <Loader2 size={16} className="animate-spin text-event-navy/50" />
          <span className="font-body text-xs text-event-navy/50">Mencari...</span>
        </div>
      )}

      {!isLoading && query.trim().length >= 2 && results.length === 0 && (
        <p className="font-body text-xs text-event-navy/50 text-center py-3">
          Tidak ditemukan sekolah dengan nama itu
        </p>
      )}

      <div className="flex flex-col gap-2">
  {query.trim().length >= 2 && results.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => !s.tendaTerkunci && onSelect(s)}
            disabled={s.tendaTerkunci}
            className={`text-left border-2 p-3 transition-colors ${
              s.tendaTerkunci
                ? 'border-event-navy/20 bg-event-navy/5 cursor-not-allowed opacity-60'
                : 'border-event-navy hover:bg-event-cream cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-body font-bold text-sm text-event-navy">{s.namaLengkap}</span>
              {s.tendaTerkunci && <Lock size={14} className="text-event-navy/40 shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="default">{s.kategori}</Badge>
              <span className="font-body text-[11px] text-event-navy/50">{s.kodePendaftaran}</span>
              <span className="font-body text-[11px] text-event-navy/50">
                {s.jumlahPeserta > 0
                  ? `${s.jumlahPeserta} peserta terdaftar`
                  : `Estimasi ${s.estimasiPesertaPendamping ?? '-'} orang`}
              </span>
            </div>
            {s.tendaTerkunci && (
              <p className="font-body text-[10px] text-pmi-red mt-1">
                Pembayaran tenda sudah diproses, tidak bisa diubah lagi
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}