'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { CariSekolah } from '@/components/tenda-sewa/cari-sekolah'
import { BuatSekolahBaru } from '@/components/tenda-sewa/buat-sekolah-baru'
import { PemilihanTenda } from '@/components/tenda-sewa/pemilihan-tenda'

export default function SewaTendaPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'cari' | 'baru'>('cari')
  const [sekolahId, setSekolahId] = useState<string | null>(null)

  function handleTendaSuccess() {
    if (!sekolahId) return
    router.push(`/tenda/pembayaran/${sekolahId}`)
  }

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-4">
          <div className="relative w-76 h-60 sm:w-104 sm:h-[200px] shrink-0">
                              <Image
                                src="/assets/LogoEvent.png"
                                alt="Logo Event"
                                fill
                                className="object-contain"
                                priority
                              />
                            </div>
        </div>
        <h1 className="font-heading text-lg sm:text-xl text-event-navy leading-relaxed">
          SEWA TENDA
        </h1>
        <p className="font-body text-xs sm:text-sm text-event-navy/70 max-w-md">
          Bisa dilakukan sebelum atau sesudah pendaftaran peserta
        </p>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-6">
        {!sekolahId && (
          <Card>
            <CardContent className="pt-5 flex flex-col gap-4">
              <Tabs
                tabs={[
                  { key: 'cari', label: 'Sudah Daftar Peserta' },
                  { key: 'baru', label: 'Belum Daftar Peserta' },
                ]}
                activeKey={tab}
                onChange={(key) => setTab(key as 'cari' | 'baru')}
              />
              {tab === 'cari' && <CariSekolah onSelect={(s) => setSekolahId(s.id)} />}
              {tab === 'baru' && <BuatSekolahBaru onCreated={(id) => setSekolahId(id)} />}
            </CardContent>
          </Card>
        )}

        {sekolahId && <PemilihanTenda sekolahId={sekolahId} onSuccess={handleTendaSuccess} />}
      </div>
    </main>
  )
}