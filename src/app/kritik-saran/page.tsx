'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Send, MessageSquareQuote, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface KritikSaranItem {
  id: string
  nama: string | null
  pesan: string
  ratingPendaftaran: number
  ratingPerkemahan: number
  ratingAcara: number
  createdAt: string
}

const KATEGORI_RATING = [
  { key: 'ratingPendaftaran', label: 'Pendaftaran' },
  { key: 'ratingPerkemahan', label: 'Perkemahan' },
  { key: 'ratingAcara', label: 'Acara' },
] as const

type RatingKey = (typeof KATEGORI_RATING)[number]['key']

function BintangTampil({ nilai, size = 12 }: { nilai: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${nilai} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((bintang) => (
        <Star
          key={bintang}
          size={size}
          className={bintang <= nilai ? 'fill-event-yellow text-event-navy' : 'text-event-navy/25'}
        />
      ))}
    </span>
  )
}

function BarisBintangInput({
  label,
  nilai,
  onPilih,
}: {
  label: string
  nilai: number
  onPilih: (nilai: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-2 border-event-navy/15 px-3 py-2.5 bg-white">
      <span className="font-body text-xs font-bold text-event-navy">{label}</span>
      <span className="inline-flex items-center gap-1" role="radiogroup" aria-label={`Penilaian ${label}`}>
        {[1, 2, 3, 4, 5].map((bintang) => (
          <button
            key={bintang}
            type="button"
            role="radio"
            aria-checked={nilai === bintang}
            aria-label={`${bintang} bintang untuk ${label}`}
            onClick={() => onPilih(bintang)}
            className="p-0.5 transition-transform hover:scale-125 active:scale-95"
          >
            <Star
              size={24}
              className={bintang <= nilai ? 'fill-event-yellow text-event-navy' : 'text-event-navy/25'}
            />
          </button>
        ))}
      </span>
    </div>
  )
}

export default function KritikSaranPage() {
  const [nama, setNama] = useState('')
  const [pesan, setPesan] = useState('')
  const [rating, setRating] = useState<Record<RatingKey, number>>({
    ratingPendaftaran: 0,
    ratingPerkemahan: 0,
    ratingAcara: 0,
  })
  const [items, setItems] = useState<KritikSaranItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    let aktif = true
    fetch('/api/kritik-saran')
      .then((res) => res.json())
      .then((result) => {
        if (aktif && result.success) setItems(result.data)
      })
      .catch(() => {})
      .finally(() => {
        if (aktif) setIsLoading(false)
      })
    return () => {
      aktif = false
    }
  }, [])

  async function handleKirim() {
    if (pesan.trim().length < 10) {
      toast.error('Kritik & saran minimal 10 karakter')
      return
    }
    const belumDinilai = KATEGORI_RATING.find((kategori) => rating[kategori.key] === 0)
    if (belumDinilai) {
      toast.error(`Beri penilaian bintang untuk ${belumDinilai.label} terlebih dahulu`)
      return
    }
    setIsSending(true)
    try {
      const res = await fetch('/api/kritik-saran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: nama.trim() || undefined, pesan: pesan.trim(), ...rating }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal mengirim kritik & saran')
      toast.success(result.message)
      setNama('')
      setPesan('')
      setRating({ ratingPendaftaran: 0, ratingPerkemahan: 0, ratingAcara: 0 })
      setItems((prev) => [result.data, ...prev].slice(0, 20))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="sticky top-0 z-50 bg-white border-b-2 border-event-navy/15 shadow-[var(--shadow-soft)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-body text-xs text-event-navy hover:text-event-blue transition-colors"
          >
            <ArrowLeft size={14} />
            Kembali
          </Link>
          <div className="relative w-20 h-8 sm:w-24 sm:h-9">
            <Image src="/assets/LogoEvent.png" alt="Logo PMI" fill className="object-contain" priority />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-pmi-pink/10 border border-pmi-pink/30 text-pmi-pink font-body text-[10px] font-bold tracking-wide mx-auto">
            KRITIK & SARAN
          </div>
          <h1 className="font-heading text-lg sm:text-xl text-event-navy">SUARAMU BERARTI</h1>
          <p className="font-body text-xs text-event-navy/60">
            Beri penilaian bintang dan sampaikan kritik & saran untuk acara ini.
          </p>
        </div>

        <div className="bg-white border-2 border-event-navy shadow-pixel p-5 sm:p-8 flex flex-col gap-4">
          <Input
            label="Nama (opsional)"
            placeholder="Tulis namamu atau kosongkan untuk anonim"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            disabled={isSending}
          />
          <div className="flex flex-col gap-2">
            <span className="font-body font-medium text-sm text-event-navy">Beri Penilaian</span>
            {KATEGORI_RATING.map((kategori) => (
              <BarisBintangInput
                key={kategori.key}
                label={kategori.label}
                nilai={rating[kategori.key]}
                onPilih={(nilai) => setRating((prev) => ({ ...prev, [kategori.key]: nilai }))}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="kritik-saran-pesan" className="font-body font-medium text-sm text-event-navy">
              Kritik & Saran
            </label>
            <textarea
              id="kritik-saran-pesan"
              rows={4}
              maxLength={1000}
              placeholder="Tulis kritik & saranmu di sini (minimal 10 karakter)..."
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              disabled={isSending}
              className="font-body w-full px-3.5 py-2.5 bg-white border rounded-[var(--radius-input)] border-[var(--color-border)] focus:outline-none focus:border-event-blue focus:shadow-[var(--shadow-focus-blue)] text-sm text-event-navy placeholder:text-gray-400 disabled:opacity-50"
            />
            <span className="font-body text-[10px] text-gray-400 text-right">{pesan.length}/1000</span>
          </div>
          <Button type="button" variant="primary" onClick={() => void handleKirim()} isLoading={isSending} className="flex items-center justify-center gap-1.5">
            <Send size={14} />
            Kirim Kritik & Saran
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <p className="font-heading text-[11px] text-event-navy tracking-wide text-center">
            KRITIK & SARAN MASUK ({items.length})
          </p>
          {isLoading ? (
            <p className="font-body text-xs text-event-navy/50 text-center py-6">Memuat kritik & saran...</p>
          ) : items.length === 0 ? (
            <div className="bg-white border-2 border-event-navy/20 py-8 flex flex-col items-center gap-2">
              <MessageSquareQuote size={24} className="text-event-navy/30" />
              <p className="font-body text-xs text-event-navy/50">Belum ada kritik & saran. Jadilah yang pertama!</p>
            </div>
          ) : (
            items.map((item) => (
              <article key={item.id} className="bg-white border-2 border-event-navy shadow-pixel-sm p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-body font-bold text-xs text-event-navy truncate">
                    {item.nama?.trim() || 'Anonim'}
                  </p>
                  <p className="font-body text-[10px] text-event-navy/50 shrink-0">
                    {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="font-body text-[10px] text-event-navy/60">
                    Pendaftaran <BintangTampil nilai={item.ratingPendaftaran} />
                  </span>
                  <span className="font-body text-[10px] text-event-navy/60">
                    Perkemahan <BintangTampil nilai={item.ratingPerkemahan} />
                  </span>
                  <span className="font-body text-[10px] text-event-navy/60">
                    Acara <BintangTampil nilai={item.ratingAcara} />
                  </span>
                </div>
                <p className="font-body text-xs text-event-navy leading-relaxed break-words">{item.pesan}</p>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
