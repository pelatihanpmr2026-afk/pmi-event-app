'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { VerifikasiSekolahForm } from '@/components/verifikasi-sekolah-form'

interface SekolahSearchResult { id: string; namaLengkap: string; kategori: string; kodePendaftaran: string; jumlahPeserta: number; estimasiPesertaPendamping: number | null; tendaTerkunci: boolean }
export function CariSekolah({ onSelect, initialQuery }: { onSelect: (sekolah: SekolahSearchResult) => void; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery ?? ''); const [results, setResults] = useState<SekolahSearchResult[]>([]); const [isLoading, setIsLoading] = useState(false); const [selected, setSelected] = useState<SekolahSearchResult | null>(null); const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { if (debounceRef.current) clearTimeout(debounceRef.current); if (query.trim().length < 2) return; debounceRef.current = setTimeout(async () => { setIsLoading(true); try { const res = await fetch(`/api/sekolah/search?q=${encodeURIComponent(query.trim())}`); const result = await res.json(); setResults(result.success ? result.data : []) } finally { setIsLoading(false) } }, 400); return () => { if (debounceRef.current) clearTimeout(debounceRef.current) } }, [query])
  if (selected) return <div className="flex flex-col gap-3"><div className="border-3 border-event-blue bg-event-blue/10 shadow-pixel-sm p-4"><p className="font-body font-bold text-sm text-event-navy">{selected.namaLengkap}</p><p className="font-body text-xs text-event-navy/70">{selected.kategori}. Pastikan ini sekolah Anda sebelum melanjutkan.</p></div><VerifikasiSekolahForm
        title="VERIFIKASI KEPEMILIKAN SEKOLAH"
        description={`Sekolah "${selected.namaLengkap}" akan dipakai untuk sewa tenda. Verifikasi dengan No. WhatsApp pembina yang terdaftar.`}
        endpoint="/api/sekolah/tenda/verify"
        sekolahId={selected.id}
        buttonLabel="Ini sekolah saya"
        onSuccess={() => onSelect(selected)}
        onCancel={() => setSelected(null)}
      /></div>
  return <div className="flex flex-col gap-3"><Input label="Cari Nama Sekolah" placeholder="Ketik minimal 2 huruf, misal: SMAN 1" value={query} onChange={(event) => setQuery(event.target.value)} />{isLoading && <div className="flex items-center gap-2 justify-center py-3"><Loader2 size={16} className="animate-spin text-event-navy/50" /><span className="font-body text-xs text-event-navy/50">Mencari...</span></div>}{!isLoading && query.trim().length >= 2 && results.length === 0 && <p className="font-body text-xs text-event-navy/50 text-center py-3">Tidak ditemukan sekolah dengan nama itu</p>}<div className="flex flex-col gap-2">{results.map((s) => <button key={s.id} type="button" onClick={() => !s.tendaTerkunci && setSelected(s)} disabled={s.tendaTerkunci} className={`text-left border-3 p-3 transition-all ${s.tendaTerkunci ? 'border-event-navy/20 bg-event-navy/5 cursor-not-allowed opacity-60' : 'border-event-navy bg-white shadow-pixel-sm hover:bg-event-cream hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel'}`}><div className="flex items-center justify-between gap-2"><span className="font-body font-bold text-sm text-event-navy">{s.namaLengkap}</span>{s.tendaTerkunci && <Lock size={14} className="text-event-navy/40" />}</div><div className="mt-1 flex items-center gap-2"><Badge variant="default">{s.kategori}</Badge><span className="font-body text-[11px] text-event-navy/50">{s.jumlahPeserta > 0 ? `${s.jumlahPeserta} peserta terdaftar` : `Estimasi ${s.estimasiPesertaPendamping ?? '-'} orang`}</span></div>{s.tendaTerkunci && <p className="font-body text-[10px] text-pmi-red mt-1">Pembayaran tenda sudah diproses, tidak bisa diubah lagi</p>}</button>)}</div></div>
}
