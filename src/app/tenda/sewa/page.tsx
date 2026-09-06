'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { PixelPageShell } from '@/components/public/pixel-page-shell'
import { CariSekolah } from '@/components/tenda-sewa/cari-sekolah'
import { BuatSekolahBaru } from '@/components/tenda-sewa/buat-sekolah-baru'
import { PemilihanTenda } from '@/components/tenda-sewa/pemilihan-tenda'
import type { DataSekolahMiniValues } from '@/lib/validations/sekolah'
import { TENDA_RESERVASI_SEMENTARA_MENIT } from '@/lib/constants-sekolah'

const CTX_KEY_SEKOLAH = 'tenda-sewa-sekolah-id'
const CTX_KEY_DRAFT = 'tenda-sewa-draft-sekolah'
const LOCAL_STORAGE_TTL = TENDA_RESERVASI_SEMENTARA_MENIT * 60 * 1000

const MARQUEE_ITEMS = ['SEWA TENDA', 'PERKEMAHAN', 'KUOTA TERBATAS', 'JANGAN SAMPAI KETINGGALAN']

function loadTimedValue<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data?: T; savedAt?: number }
    if (!parsed.data || typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > LOCAL_STORAGE_TTL) {
      window.localStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    window.localStorage.removeItem(key)
    return null
  }
}

function saveTimedValue<T>(key: string, data: T) {
  window.localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }))
}

export default function SewaTendaPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'cari' | 'baru'>('cari')
  const [sekolahId, setSekolahId] = useState<string | null>(null)
  const [draftSekolah, setDraftSekolah] = useState<DataSekolahMiniValues | null>(null)
  const [cariQuery, setCariQuery] = useState('')
  const [hydrated, setHydrated] = useState(false)

  // Pulihkan konteks (sekolah terpilih) dari localStorage setelah refresh (U2).
  useEffect(() => {
    const timer = setTimeout(() => {
      const sid = loadTimedValue<string>(CTX_KEY_SEKOLAH)
      const draft = loadTimedValue<DataSekolahMiniValues>(CTX_KEY_DRAFT)
      if (sid) setSekolahId(sid)
      if (draft) setDraftSekolah(draft)
      if (!sid && !draft) window.localStorage.removeItem('tenda-sewa-selection:__draft__')
      if (!sid) {
        const staleSelectionKey = window.localStorage.getItem('tenda-sewa-last-school-id')
        if (staleSelectionKey) window.localStorage.removeItem(`tenda-sewa-selection:${staleSelectionKey}`)
        window.localStorage.removeItem('tenda-sewa-last-school-id')
      }
      setHydrated(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (sekolahId) {
      saveTimedValue(CTX_KEY_SEKOLAH, sekolahId)
      window.localStorage.setItem('tenda-sewa-last-school-id', sekolahId)
    }
    else window.localStorage.removeItem(CTX_KEY_SEKOLAH)
  }, [sekolahId, hydrated])

  useEffect(() => {
    if (!hydrated) return
    if (draftSekolah) saveTimedValue(CTX_KEY_DRAFT, draftSekolah)
    else window.localStorage.removeItem(CTX_KEY_DRAFT)
  }, [draftSekolah, hydrated])

  function handleTendaSuccess(hasReservation: boolean, pilihan?: { tendaJenisId: string; jumlah: number }[]) {
    if (draftSekolah && pilihan) {
      window.localStorage.removeItem(CTX_KEY_DRAFT)
      window.localStorage.removeItem(CTX_KEY_SEKOLAH)
      router.push(`/tenda/pembayaran/${pilihan[0].tendaJenisId}`)
      return
    }
    if (!sekolahId) return
    if (!hasReservation) {
      setSekolahId(null)
      setTab('cari')
      return
    }
    window.localStorage.removeItem(CTX_KEY_SEKOLAH)
    window.localStorage.removeItem(CTX_KEY_DRAFT)
    router.push(`/tenda/pembayaran/${sekolahId}`)
  }

  return (
    <PixelPageShell
      title="SEWA TENDA"
      subtitle="Bisa dilakukan sebelum atau sesudah pendaftaran peserta"
      marqueeItems={MARQUEE_ITEMS}
      marqueeVariant="yellow"
    >
      <div className="w-full flex flex-col gap-6">
        {!sekolahId && !draftSekolah && (
          <Card pixel>
            <CardContent className="pt-5 flex flex-col gap-4">
              <Tabs
                pixel
                tabs={[
                  { key: 'cari', label: 'Cari Sekolah' },
                  { key: 'baru', label: 'Sekolah Baru' },
                ]}
                activeKey={tab}
                onChange={(key) => {
                  setTab(key as 'cari' | 'baru')
                  setCariQuery('')
                }}
              />
              {tab === 'cari' && <CariSekolah initialQuery={cariQuery} onSelect={(s) => setSekolahId(s.id)} />}
              {tab === 'baru' && <BuatSekolahBaru onCreated={(data) => setDraftSekolah(data)} onExisting={(nama) => { setCariQuery(nama); setTab('cari') }} />}
            </CardContent>
          </Card>
        )}

        {draftSekolah && !sekolahId && <PemilihanTenda draftSekolah={draftSekolah} onSuccess={handleTendaSuccess} />}
        {sekolahId && <PemilihanTenda sekolahId={sekolahId} onSuccess={handleTendaSuccess} />}
      </div>
    </PixelPageShell>
  )
}
