'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { FileSpreadsheet, Clock, CheckCircle2, XCircle, PieChart } from 'lucide-react'
import { DIVISI_OPTIONS } from '@/lib/constants-keuangan'

export type PengajuanDivisiBreakdown = {
  divisi: string
  disetujui: number
  dicairkan: number
  sisa: number
}

function formatRp(n: number) {
  return `Rp${n.toLocaleString('id-ID')}`
}

function divisiLabel(value: string) {
  return DIVISI_OPTIONS.find((d) => d.value === value)?.label ?? value
}

export function PengajuanStats({
  total,
  menunggu,
  disetujui,
  ditolak,
  totalNominalDisetujui,
  totalBelanjaDisetujui,
  totalSisaAnggaran,
  divisiBreakdown,
}: {
  total: number
  menunggu: number
  disetujui: number
  ditolak: number
  totalNominalDisetujui: number
  totalBelanjaDisetujui: number
  totalSisaAnggaran: number
  divisiBreakdown: PengajuanDivisiBreakdown[]
}) {
  const [showRincian, setShowRincian] = useState(false)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-navy text-white">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} />
          <span className="font-body text-xs font-medium">Total Pengajuan</span>
        </div>
        <span className="font-body text-2xl font-bold">{total}</span>
      </Card>

      <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-yellow">
        <div className="flex items-center gap-2 text-event-navy">
          <Clock size={18} />
          <span className="font-body text-xs text-gray-600">Menunggu Diproses</span>
        </div>
        <span className="font-body text-2xl font-bold text-event-navy">{menunggu}</span>
      </Card>

      <Card className="p-4 sm:p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-event-navy">
          <CheckCircle2 size={18} className="text-green-600" />
          <span className="font-body text-xs text-gray-500">Disetujui</span>
        </div>
        <span className="font-body text-2xl font-bold text-event-navy">{disetujui}</span>
        <span className="font-body text-xs text-gray-400">
          {formatRp(totalNominalDisetujui)}
        </span>
      </Card>

      <Card className="p-4 sm:p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-event-navy">
          <XCircle size={18} className="text-pmi-red" />
          <span className="font-body text-xs text-gray-500">Ditolak</span>
        </div>
        <span className="font-body text-2xl font-bold text-event-navy">{ditolak}</span>
      </Card>

      <button
        type="button"
        onClick={() => setShowRincian(true)}
        className="text-left cursor-pointer p-0 border-0 bg-transparent"
      >
        <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-blue text-white h-full">
          <div className="flex items-center gap-2">
            <PieChart size={18} />
            <span className="font-body text-xs font-medium">Sisa Anggaran Disetujui</span>
          </div>
          <span className="font-body text-2xl font-bold">{formatRp(totalSisaAnggaran)}</span>
          <span className="font-body text-[10px] opacity-80">
            Dari {formatRp(totalNominalDisetujui)} — sudah dibelanjakan {formatRp(totalBelanjaDisetujui)} · klik rincian
          </span>
        </Card>
      </button>

      <Modal
        isOpen={showRincian}
        onClose={() => setShowRincian(false)}
        title="RINCIAN SISA ANGGARAN PER DIVISI"
      >
        {divisiBreakdown.length === 0 ? (
          <p className="font-body text-sm text-event-navy/60">
            Belum ada pengajuan yang disetujui.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2 pb-1 text-[10px] font-heading text-gray-400">
              <span>Divisi</span>
              <span className="text-right">Disetujui</span>
              <span className="text-right">Sudah Dicairkan</span>
            </div>
            {divisiBreakdown.map((row) => (
              <div
                key={row.divisi}
                className="border-b border-[var(--color-border)] pb-2"
              >
                <div className="grid grid-cols-3 gap-2 items-center">
                  <span className="font-body text-sm text-event-navy">{divisiLabel(row.divisi)}</span>
                  <span className="font-body text-xs text-gray-500 font-medium text-right">
                    {formatRp(row.disetujui)}
                  </span>
                  <span className="font-body font-bold text-sm text-event-navy text-right">
                    {formatRp(row.dicairkan)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-body text-[10px] text-gray-400">
                    Sisa anggaran divisi: {formatRp(row.sisa)}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="font-body font-bold text-sm text-event-navy">Total Sisa</span>
              <span className="font-body font-bold text-sm text-event-navy">{formatRp(totalSisaAnggaran)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}