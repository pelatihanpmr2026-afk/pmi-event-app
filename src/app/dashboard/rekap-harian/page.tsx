'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/tabs'
import { RekapKeuanganPanel } from '@/components/dashboard/rekap-harian/rekap-keuangan-panel'
import { RekapPendaftaranPanel } from '@/components/dashboard/rekap-harian/rekap-pendaftaran-panel'

export default function RekapHarianPage() {
  const [tab, setTab] = useState<'keuangan' | 'pendaftaran'>('keuangan')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">REKAP HARIAN</h1>
        <p className="font-body text-xs text-event-navy/60 mt-1">Download rekap keuangan atau pendaftaran per tanggal</p>
      </div>

      <Tabs
        tabs={[
          { key: 'keuangan', label: 'Keuangan' },
          { key: 'pendaftaran', label: 'Pendaftaran' },
        ]}
        activeKey={tab}
        onChange={(key) => setTab(key as 'keuangan' | 'pendaftaran')}
      />

      {tab === 'keuangan' ? <RekapKeuanganPanel /> : <RekapPendaftaranPanel />}
    </div>
  )
}