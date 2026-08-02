'use client'

import Image from 'next/image'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Check, X } from 'lucide-react'
import { ASAL_UNIT_OPTIONS, DIVISI_OPTIONS, GENDER_OPTIONS } from '@/lib/constants'

export interface AbsensiLogData {
  sesiId: string
  scannedAt: string
}

export interface SesiRingkas {
  id: string
  nama: string
  tanggal: string
}

export interface PanitiaData {
  id: string
  nomorRegistrasi: string
  nama: string
  gender: string
  noWhatsapp: string
  alamat: string
  asalUnit: string
  divisi: string
  fotoUrl: string
  qrCodeUrl: string | null
  idCardUrl: string | null
  status: string
  createdAt: string
  absensiLogs: AbsensiLogData[]
}

function findLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((opt) => opt.value === value)?.label ?? value
}

export function PanitiaDetailModal({
  panitia,
  sesiList,
  isOpen,
  onClose,
}: {
  panitia: PanitiaData | null
  sesiList: SesiRingkas[]
  isOpen: boolean
  onClose: () => void
}) {
  if (!panitia) return null

  const rows = [
    { label: 'No. Registrasi', value: panitia.nomorRegistrasi },
    { label: 'Nama Lengkap', value: panitia.nama },
    { label: 'Jenis Kelamin', value: findLabel(GENDER_OPTIONS, panitia.gender) },
    { label: 'No. WhatsApp', value: panitia.noWhatsapp },
    { label: 'Alamat', value: panitia.alamat },
    { label: 'Asal Unit', value: findLabel(ASAL_UNIT_OPTIONS, panitia.asalUnit) },
    { label: 'Divisi', value: findLabel(DIVISI_OPTIONS, panitia.divisi) },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="DETAIL PANITIA">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 border-3 border-event-navy shrink-0 overflow-hidden">
            <Image src={panitia.fotoUrl} alt={panitia.nama} fill className="object-cover" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-body font-bold text-sm text-event-navy">{panitia.nama}</span>
            <Badge variant={panitia.status === 'HADIR' ? 'success' : 'info'}>
              {panitia.status}
            </Badge>
          </div>
        </div>

        <div className="border-3 border-event-navy">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`flex flex-col sm:flex-row sm:items-center px-4 py-2.5 ${
                i !== rows.length - 1 ? 'border-b-2 border-event-navy/20' : ''
              }`}
            >
              <span className="font-body font-bold text-[11px] text-event-navy/60 w-full sm:w-32 shrink-0">
                {row.label}
              </span>
              <span className="font-body text-xs text-event-navy break-words">{row.value}</span>
            </div>
          ))}
        </div>

        {sesiList.length > 0 && (
          <div>
            <p className="font-body font-bold text-xs text-event-navy/70 mb-2">
              Riwayat Kehadiran
            </p>
            <div className="border-3 border-event-navy">
              {sesiList.map((sesi, i) => {
                const log = panitia.absensiLogs.find((l) => l.sesiId === sesi.id)
                const hadir = !!log

                return (
                  <div
                    key={sesi.id}
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      i !== sesiList.length - 1 ? 'border-b-2 border-event-navy/20' : ''
                    }`}
                  >
                    <div>
                      <p className="font-body font-bold text-xs text-event-navy">{sesi.nama}</p>
                      <p className="font-body text-[10px] text-event-navy/50">
                        {new Date(sesi.tanggal).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                        {hadir &&
                          ` · ${new Date(log.scannedAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} WIB`}
                      </p>
                    </div>
                    <div
                      className={`w-7 h-7 flex items-center justify-center border-2 border-event-navy shrink-0 ${
                        hadir ? 'bg-green-500' : 'bg-event-navy/10'
                      }`}
                    >
                      {hadir ? (
                        <Check size={14} className="text-white" />
                      ) : (
                        <X size={14} className="text-event-navy/40" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {panitia.idCardUrl && (
            <a href={panitia.idCardUrl} download={`IDCard-${panitia.nama}.png`}>
              <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-1.5">
                <Download size={14} />
                ID Card
              </Button>
            </a>
          )}
          {panitia.qrCodeUrl && (
            <a href={panitia.qrCodeUrl} download={`QRCode-${panitia.nama}.png`}>
              <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-1.5">
                <Download size={14} />
                QR Code
              </Button>
            </a>
          )}
        </div>
      </div>
    </Modal>
  )
}