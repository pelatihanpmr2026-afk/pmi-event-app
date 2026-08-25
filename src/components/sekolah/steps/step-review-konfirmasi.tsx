'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from '@/lib/constants-sekolah'
import type { DataSekolahResult } from './step-data-sekolah'
import type { PesertaPendampingValues } from '@/lib/validations/peserta'

export function StepReviewKonfirmasi({
  dataSekolah,
  dataPeserta,
  onComplete,
  onBack,
  onEdit,
}: {
  dataSekolah: DataSekolahResult
  dataPeserta: PesertaPendampingValues
  onComplete: () => void
  onBack: () => void
  onEdit: (step: number) => void
}) {
  const [isConfirmed, setIsConfirmed] = useState(false)
  const jumlahPeserta = dataPeserta.peserta.length
  const jumlahPendamping = dataPeserta.pendamping.length
  const totalBiaya = jumlahPeserta * BIAYA_PESERTA + jumlahPendamping * BIAYA_PENDAMPING

  // PENTING: step ini HANYA menampilkan ringkasan data untuk dicek ulang.
  // Data belum dikirim ke server di sini. Pengiriman (POST /api/sekolah)
  // baru dilakukan di StepFinalPayment karena API mewajibkan bukti transfer
  // ikut dalam satu request yang sama. Kalau step ini mengirim ke API
  // duluan (tanpa bukti transfer), API akan selalu menolak dengan pesan
  // "Bukti transfer wajib diupload" — itulah bug yang sebelumnya terjadi.
  function handleConfirm() {
    onComplete()
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="font-body text-sm text-gray-500 text-center">
        Periksa kembali seluruh data sebelum lanjut ke pembayaran
      </p>

<div className="border-3 border-event-navy rounded-[var(--radius-card)] overflow-hidden shadow-pixel-sm">
        <div className="bg-event-blue px-4 py-2.5">
          <div className="flex items-center justify-between"><span className="font-heading text-[10px] text-white">DATA SEKOLAH</span><button type="button" onClick={() => onEdit(1)} className="font-body text-xs text-white underline">Ubah Data Sekolah</button></div>
        </div>
        <div className="p-4 flex flex-col gap-2 bg-white">
          <div className="flex justify-between font-body text-sm">
            <span className="text-gray-500">Nama Sekolah</span>
            <span className="font-semibold text-event-navy text-right">{dataSekolah.namaLengkap}</span>
          </div>
          <div className="flex justify-between font-body text-sm">
            <span className="text-gray-500">Kategori PMR</span>
            <span className="font-semibold text-event-navy">{dataSekolah.kategori === 'MADYA' ? 'Madya' : 'Wira'}</span>
          </div>
          <div className="flex justify-between font-body text-sm">
            <span className="text-gray-500">Pembina/Pelatih</span>
            <span className="font-semibold text-event-navy">{dataSekolah.namaPembina}</span>
          </div>
          <div className="flex justify-between font-body text-sm">
            <span className="text-gray-500">No. WhatsApp</span>
            <span className="font-semibold text-event-navy">{dataSekolah.noWhatsappPembina}</span>
          </div>
        </div>
      </div>

      <div className="border-3 border-event-navy rounded-[var(--radius-card)] overflow-hidden shadow-pixel-sm">
        <div className="bg-event-navy px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3"><button type="button" onClick={() => onEdit(2)} className="font-body text-xs text-white underline">Ubah Peserta</button><span className="font-heading text-[10px] text-white">PESERTA</span></div>
          <Badge variant="info">{jumlahPeserta} orang</Badge>
        </div>
        <div className="p-3 flex flex-col gap-2 max-h-64 overflow-y-auto bg-white">
          {dataPeserta.peserta.map((p, i) => (
            <PesertaPreviewRow key={i} nomor={i + 1} nama={p.namaLengkap} foto={p.foto} gender={p.gender} tempatLahir={p.tempatLahir} tanggalLahir={p.tanggalLahir} />
          ))}
        </div>
      </div>

      <div className="border-3 border-event-navy rounded-[var(--radius-card)] overflow-hidden shadow-pixel-sm">
        <div className="bg-event-pink px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3"><button type="button" onClick={() => onEdit(3)} className="font-body text-xs text-white underline">Ubah Pendamping</button><span className="font-heading text-[10px] text-white">PENDAMPING</span></div>
          <Badge variant="info">{jumlahPendamping} orang</Badge>
        </div>
        <div className="p-3 flex flex-col gap-1.5 max-h-48 overflow-y-auto bg-white">
          {jumlahPendamping === 0 && (
            <p className="font-body text-sm text-gray-400 text-center py-2">
              Tidak ada pendamping didaftarkan
            </p>
          )}
          {dataPeserta.pendamping.map((p, i) => (
            <div key={i} className="flex items-center gap-2 font-body text-sm text-event-navy">
              <span className="text-gray-400 w-5">{i + 1}.</span>
              <span className="font-semibold">{p.namaLengkap}</span><span className="text-gray-400">{p.tempatLahir}, {p.tanggalLahir}</span>
              <span className="text-gray-400">({p.gender === 'LAKI_LAKI' ? 'L' : 'P'})</span>
            </div>
          ))}
        </div>
      </div>

<div className="border-3 border-event-navy rounded-[var(--radius-card)] bg-event-yellow/10 p-4 flex flex-col gap-2 shadow-pixel-sm">
        <div className="flex justify-between font-body text-sm text-event-navy">
          <span>{jumlahPeserta} Peserta × Rp{BIAYA_PESERTA.toLocaleString('id-ID')}</span>
          <span className="font-medium">Rp{(jumlahPeserta * BIAYA_PESERTA).toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between font-body text-sm text-event-navy">
          <span>{jumlahPendamping} Pendamping × Rp{BIAYA_PENDAMPING.toLocaleString('id-ID')}</span>
          <span className="font-medium">Rp{(jumlahPendamping * BIAYA_PENDAMPING).toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/30">
          <span>TOTAL YANG HARUS DITRANSFER</span>
          <span>Rp{totalBiaya.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <label className="flex items-start gap-2 font-body text-xs text-event-navy cursor-pointer">
        <input type="checkbox" checked={isConfirmed} onChange={(event) => setIsConfirmed(event.target.checked)} className="mt-0.5" />
        <span>Saya menyatakan data peserta, pendamping, dan total biaya di atas sudah benar.</span>
      </label>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" pixel onClick={onBack}>
          Kembali
        </Button>
        <Button type="button" variant="primary" pixel onClick={handleConfirm} disabled={!isConfirmed}>
          Konfirmasi & Lanjut
        </Button>
      </div>
    </div>
  )
}

function PesertaPreviewRow({ nomor, nama, foto, gender, tempatLahir, tanggalLahir }: { nomor: number; nama: string; foto: File; gender: string; tempatLahir: string; tanggalLahir: string }) {
  const url = foto instanceof File ? URL.createObjectURL(foto) : ''
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="font-body text-sm text-gray-400 w-5">{nomor}.</span>
      {url && (
        <div className="relative w-8 h-8 border border-[var(--color-border)] rounded-[var(--radius-input)] shrink-0 overflow-hidden">
          <Image src={url} alt={nama} fill className="object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0"><span className="block font-body text-sm font-medium text-event-navy truncate">{nama}</span><span className="block font-body text-[10px] text-gray-400 truncate">{tempatLahir}, {tanggalLahir}</span></div>
      <span className="font-body text-sm text-gray-400">({gender === 'LAKI_LAKI' ? 'L' : 'P'})</span>
    </div>
  )
}
