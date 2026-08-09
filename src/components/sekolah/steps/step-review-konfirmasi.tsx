'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BIAYA_PESERTA,
  BIAYA_PENDAMPING,
} from '@/lib/constants-sekolah'
import type { DataSekolahResult } from './step-data-sekolah'
import type { PesertaPendampingValues } from '@/lib/validations/peserta'
import { TermsModal } from '../terms-modal'

export function StepReviewKonfirmasi({
  dataSekolah,
  dataPeserta,
  onComplete,
  onBack,
  onDisagreeReset,
}: {
  dataSekolah: DataSekolahResult
  dataPeserta: PesertaPendampingValues
  onComplete: () => void
  onBack: () => void
  onDisagreeReset: () => void
}) {
  const [isTermsOpen, setIsTermsOpen] = useState(false)

  const jumlahPeserta = dataPeserta.peserta.length
  const jumlahPendamping = dataPeserta.pendamping.length
  const totalBiaya = jumlahPeserta * BIAYA_PESERTA + jumlahPendamping * BIAYA_PENDAMPING  

  function handleAgree() {
    setIsTermsOpen(false)
    onComplete()
  }

  function handleDisagree() {
    setIsTermsOpen(false)
    onDisagreeReset()
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="font-body text-xs text-event-navy/70 text-center">
        Periksa kembali seluruh data sebelum lanjut ke pemilihan tenda & pembayaran
      </p>

      {/* DATA SEKOLAH */}
      <div className="border-3 border-event-navy">
        <div className="bg-event-blue px-4 py-2.5">
          <span className="font-heading text-[10px] text-white">DATA SEKOLAH</span>
        </div>
        <div className="p-4 flex flex-col gap-2">
          <div className="flex justify-between font-body text-xs">
            <span className="text-event-navy/60">Nama Sekolah</span>
            <span className="font-bold text-event-navy text-right">{dataSekolah.namaLengkap}</span>
          </div>
          <div className="flex justify-between font-body text-xs">
            <span className="text-event-navy/60">Kategori</span>
            <span className="font-bold text-event-navy">
              {dataSekolah.jenjang === 'SMP' || dataSekolah.jenjang === 'MTS' ? 'Madya' : 'Wira'}
            </span>
          </div>
          <div className="flex justify-between font-body text-xs">
            <span className="text-event-navy/60">Pembina/Pelatih</span>
            <span className="font-bold text-event-navy">{dataSekolah.namaPembina}</span>
          </div>
          <div className="flex justify-between font-body text-xs">
            <span className="text-event-navy/60">No. WhatsApp</span>
            <span className="font-bold text-event-navy">{dataSekolah.noWhatsappPembina}</span>
          </div>
        </div>
      </div>

      {/* PESERTA */}
      <div className="border-3 border-event-navy">
        <div className="bg-event-navy px-4 py-2.5 flex items-center justify-between">
          <span className="font-heading text-[10px] text-white">PESERTA</span>
          <Badge variant="info">{jumlahPeserta} orang</Badge>
        </div>
        <div className="p-3 flex flex-col gap-2 max-h-64 overflow-y-auto">
          {dataPeserta.peserta.map((p, i) => (
           <PesertaPreviewRow key={i} nomor={i + 1} nama={p.namaLengkap} foto={p.foto} gender={p.gender} />
          ))}
        </div>
      </div>

      {/* PENDAMPING */}
      <div className="border-3 border-event-navy">
        <div className="bg-event-pink px-4 py-2.5 flex items-center justify-between">
          <span className="font-heading text-[10px] text-white">PENDAMPING</span>
          <Badge variant="info">{jumlahPendamping} orang</Badge>
        </div>
        <div className="p-3 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          {jumlahPendamping === 0 && (
            <p className="font-body text-xs text-event-navy/50 text-center py-2">
              Tidak ada pendamping didaftarkan
            </p>
          )}
          {dataPeserta.pendamping.map((p, i) => (
            <div key={i} className="flex items-center gap-2 font-body text-xs text-event-navy py-1">
              <span className="text-event-navy/40 w-5">{i + 1}.</span>
              <span className="font-bold">{p.namaLengkap}</span>
              <span className="text-event-navy/50">
                ({p.gender === 'LAKI_LAKI' ? 'L' : 'P'})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* TOTAL BIAYA */}
      <div className="border-3 border-event-navy bg-event-yellow/20 p-4 flex flex-col gap-1.5">
        <div className="flex justify-between font-body text-xs text-event-navy">
          <span>{jumlahPeserta} Peserta × Rp35.000</span>
          <span>Rp{(jumlahPeserta * BIAYA_PESERTA).toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between font-body text-xs text-event-navy">
          <span>{jumlahPendamping} Pendamping × Rp25.000</span>
          <span>Rp{(jumlahPendamping * BIAYA_PENDAMPING).toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20">
          <span>SUBTOTAL</span>
          <span>Rp{totalBiaya.toLocaleString('id-ID')}</span>
        </div>
        <p className="font-body text-[10px] text-event-navy/50 mt-1">
          * Belum termasuk biaya sewa tenda (dipilih di step berikutnya)
        </p>
      </div>

<div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          Kembali
        </Button>
        <Button type="button" variant="primary" onClick={() => setIsTermsOpen(true)}>
          Konfirmasi & Lanjut
        </Button>
      </div>

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onAgree={handleAgree}
        onDisagree={handleDisagree}
      />
    </div>
  )
}

function PesertaPreviewRow({
  nomor,
  nama,
  foto,
  gender,
  suratPernyataan,
}: {
  nomor: number
  nama: string
  foto: File
  gender: string
  suratPernyataan?: File
}) {
  const url = foto instanceof File ? URL.createObjectURL(foto) : ''
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="font-body text-xs text-event-navy/40 w-5">{nomor}.</span>
      {url && (
        <div className="relative w-8 h-8 border-2 border-event-navy shrink-0 overflow-hidden">
          <Image src={url} alt={nama} fill className="object-cover" />
        </div>
      )}
      <span className="font-body text-xs font-bold text-event-navy flex-1 min-w-0 truncate">{nama}</span>
      <span className="font-body text-xs text-event-navy/50">
        ({gender === 'LAKI_LAKI' ? 'L' : 'P'})
      </span>
      {suratPernyataan instanceof File && (
        <span title="Surat pernyataan terlampir" className="text-green-600 text-xs">
          📄✓
        </span>
      )}
    </div>
  )
}