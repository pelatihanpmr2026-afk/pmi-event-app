'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { RIWAYAT_PENYAKIT_OPTIONS } from '@/lib/constants-sekolah'

export interface DaftarUlangResult {
  success: boolean
  message: string
  data?: {
    namaLengkap: string
    kodePendaftaran: string
    kategori: string
    jumlahPeserta: number
    jumlahPendamping: number
    tenda: { nama: string; jumlah: number }[]
    pesertaDenganRiwayatPenyakit: { namaLengkap: string; riwayatPenyakit: string }[]
  }
}

function labelRiwayatPenyakit(riwayatPenyakit: string): string {
  return RIWAYAT_PENYAKIT_OPTIONS.find((pilihan) => pilihan.value === riwayatPenyakit)?.label ?? riwayatPenyakit
}

export function DaftarUlangResultCard({ result, onClose }: { result: DaftarUlangResult | null; onClose: () => void }) {
  if (!result) {
    return (
      <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-6 text-center">
        <p className="font-body text-xs text-gray-400">Arahkan kamera ke QR Code pada kwitansi peserta sekolah</p>
      </div>
    )
  }

  if (result.data) {
    return (
      <Modal isOpen onClose={onClose} title="Detail Daftar Ulang">
        <div className="flex flex-col gap-5">
          <div className={`rounded-[var(--radius-card)] border p-3 flex items-start gap-3 ${result.success ? 'border-green-600 bg-green-50' : 'border-pmi-red bg-red-50'}`}>
            {result.success ? <CheckCircle2 size={24} className="text-green-600 shrink-0" /> : <XCircle size={24} className="text-pmi-red shrink-0" />}
            <p className={`font-body text-sm font-medium ${result.success ? 'text-green-700' : 'text-pmi-red'}`}>{result.message}</p>
          </div>

          <section>
            <p className="font-body font-bold text-base text-event-navy">{result.data.namaLengkap}</p>
            <p className="font-body text-xs text-gray-400 mt-0.5">{result.data.kodePendaftaran}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="default">{result.data.kategori}</Badge>
              <Badge variant="info">{result.data.jumlahPeserta} Peserta</Badge>
              <Badge variant="info">{result.data.jumlahPendamping} Pendamping</Badge>
            </div>
          </section>

          <section>
            <p className="font-body font-bold text-xs text-event-navy mb-2">TENDA DISEWA</p>
            {result.data.tenda.length > 0 ? (
              <div className="flex flex-col rounded-[var(--radius-input)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {result.data.tenda.map((tenda) => (
                  <div key={tenda.nama} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-body text-event-navy">{tenda.nama}</span>
                    <Badge variant="default">{tenda.jumlah} unit</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="font-body text-sm text-gray-400">Tidak menyewa tenda.</p>}
          </section>

          <section>
            <p className="font-body font-bold text-xs text-event-navy mb-2">PESERTA DENGAN RIWAYAT PENYAKIT</p>
            {result.data.pesertaDenganRiwayatPenyakit.length > 0 ? (
              <div className="flex flex-col gap-2">
                {result.data.pesertaDenganRiwayatPenyakit.map((peserta) => (
                  <div key={`${peserta.namaLengkap}-${peserta.riwayatPenyakit}`} className="rounded-[var(--radius-input)] border border-pmi-red/30 bg-red-50 px-3 py-2">
                    <p className="font-body text-sm font-medium text-event-navy">{peserta.namaLengkap}</p>
                    <p className="font-body text-xs text-pmi-red mt-0.5">{labelRiwayatPenyakit(peserta.riwayatPenyakit)}</p>
                  </div>
                ))}
              </div>
            ) : <p className="font-body text-sm text-gray-400">Tidak ada riwayat penyakit yang dilaporkan.</p>}
          </section>
        </div>
      </Modal>
    )
  }

  return (
    <div className="border border-pmi-red bg-red-50 rounded-[var(--radius-card)] p-4 flex items-start gap-3 shadow-[var(--shadow-md)] animate-pixel-pop">
      <XCircle size={28} className="text-pmi-red shrink-0 mt-0.5" />
      <p className="font-body text-sm text-pmi-red">{result.message}</p>
    </div>
  )
}
