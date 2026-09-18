'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/tabs'
import { SekolahTable } from '@/components/dashboard/sekolah-table'
import { SusulanSekolahTable } from '@/components/dashboard/sekolah/susulan-sekolah-table'
import type { AdminRoleType } from '@/lib/admin-role'

interface SekolahItem {
  id: string
  nomorPendaftaran: number | null
  namaLengkap: string
  kodePendaftaran: string | null
  jenjang: string
  kategori: string
  namaPembina: string
  jumlahPeserta: number
  jumlahPendamping: number
  jumlahTenda: number
  sudahCetak: boolean
  pembayaranPeserta: {
    id: string
    status: string
    jumlahBiaya: number
    statusDaftarUlang: boolean
    buktiTransferUrl: string | null
    kwitansiUrl: string | null
  } | null
  pembayaranTenda: {
    id: string
    status: string
    jumlahBiaya: number
    buktiTransferUrl: string | null
    kwitansiUrl: string | null
  } | null
}

interface DashboardSekolahTabsProps {
  initialData: SekolahItem[]
  initialTotal: number
  role: AdminRoleType
}

export function DashboardSekolahTabs({ initialData, initialTotal, role }: DashboardSekolahTabsProps) {
  const [activeTab, setActiveTab] = useState<'data' | 'susulan'>('data')

  const tabs = [
    { key: 'data', label: 'Data Sekolah' },
    { key: 'susulan', label: 'Data Susulan' },
  ]

  return (
    <>
      <Tabs tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as 'data' | 'susulan')} />
      {activeTab === 'data' ? (
        <SekolahTable initialData={initialData} initialTotal={initialTotal} role={role} />
      ) : (
        <SusulanSekolahTable />
      )}
    </>
  )
}
