'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { KonfirmasiPembayaranPanel } from './konfirmasi-pembayaran-panel'
import { AGAMA_OPTIONS, GOLONGAN_DARAH_OPTIONS } from '@/lib/constants-sekolah'
import { GENDER_OPTIONS } from '@/lib/constants'
import { AlertTriangle } from 'lucide-react'
import { RIWAYAT_PENYAKIT_OPTIONS, RIWAYAT_PENYAKIT_PERLU_PERHATIAN } from '@/lib/constants-sekolah'

function findLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((opt) => opt.value === value)?.label ?? value
}

interface SekolahDetail {
  id: string
  namaLengkap: string
  kodePendaftaran: string
  jenjang: string
  kategori: string
  namaPembina: string
  noWhatsappPembina: string
  excelUrl: string | null
  peserta: {
    id: string
    tipe: 'PESERTA' | 'PENDAMPING'
    namaLengkap: string
    tempatLahir: string
    tanggalLahir: string
    agama: string
    golonganDarah: string
    gender: string
  fotoUrl: string | null
    riwayatPenyakit: string | null
  }[]
  tendaSewa: { id: string; jumlah: number; tendaJenis: { nama: string } }[]
  pembayaran: {
    id: string
    tipe: 'PESERTA' | 'TENDA'
    statusPembayaran: 'BELUM_BAYAR' | 'MENUNGGU_KONFIRMASI' | 'LUNAS' | 'DITOLAK'
    jumlahBiaya: number
    buktiTransferUrl: string | null
    catatanAdmin: string | null
    kwitansiUrl: string | null
    statusDaftarUlang: boolean
    waktuDaftarUlang: string | null
  }[]
}

export function SekolahDetailModal({
  sekolahId,
  isOpen,
  onClose,
  onDataChanged,
}: {
  sekolahId: string | null
  isOpen: boolean
  onClose: () => void
  onDataChanged: () => void
}) {
  const [data, setData] = useState<SekolahDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<'peserta' | 'pendamping'>('peserta')

  const fetchDetail = useCallback(async () => {
    if (!sekolahId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/sekolah/${sekolahId}/detail`)
      const result = await res.json()
      if (result.success) setData(result.data)
      else toast.error(result.message)
    } finally {
      setIsLoading(false)
    }
  }, [sekolahId])

  useEffect(() => {
    if (isOpen && sekolahId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDetail()
    }
  }, [isOpen, sekolahId, fetchDetail])

  function handlePaymentUpdated() {
    fetchDetail()
    onDataChanged()
  }

  if (!isOpen) return null

  const pesertaList = data?.peserta.filter((p) => p.tipe === 'PESERTA') ?? []
  const pendampingList = data?.peserta.filter((p) => p.tipe === 'PENDAMPING') ?? []
  const pembayaranPeserta = data?.pembayaran.find((p) => p.tipe === 'PESERTA') ?? null
  const pembayaranTenda = data?.pembayaran.find((p) => p.tipe === 'TENDA') ?? null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="DETAIL SEKOLAH" className="max-w-2xl">
      <AnimatePresence mode="wait">
        {isLoading || !data ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8 text-center font-body text-sm text-event-navy/50"
          >
            Memuat data...
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            {/* School header */}
            <div className="border-b-2 border-event-navy/10 pb-3">
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-body font-bold text-lg text-event-navy"
              >
                {data.namaLengkap}
              </motion.p>
              <p className="font-body text-xs text-event-navy/60">{data.kodePendaftaran}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="default">{data.kategori}</Badge>
                {pembayaranPeserta?.statusPembayaran === 'LUNAS' && (
                  <Badge variant={pembayaranPeserta.statusDaftarUlang ? 'success' : 'warning'}>
                    {pembayaranPeserta.statusDaftarUlang ? 'Sudah Daftar Ulang' : 'Belum Daftar Ulang'}
                  </Badge>
                )}
                <span className="font-body text-xs text-event-navy/60">
                  Pembina: {data.namaPembina} · {data.noWhatsappPembina}
                </span>
              </div>
            </div>

            {/* Payment panels */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div className="pixel-card">
                <KonfirmasiPembayaranPanel pembayaran={pembayaranPeserta} onUpdated={handlePaymentUpdated} />
              </div>
              <div className="pixel-card">
                <KonfirmasiPembayaranPanel pembayaran={pembayaranTenda} onUpdated={handlePaymentUpdated} />
              </div>
            </motion.div>

            {/* Tenda Sewa */}
            {data.tendaSewa.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <p className="font-body font-bold text-xs text-event-navy/70 mb-2">Tenda Disewa</p>
                <div className="border-2 border-event-navy/20 bg-event-cream/30">
                  {data.tendaSewa.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className={`flex justify-between px-3 py-2 font-body text-xs text-event-navy ${
                        i !== data.tendaSewa.length - 1 ? 'border-b-2 border-event-navy/10' : ''
                      }`}
                    >
                      <span>{t.tendaJenis.nama}</span>
                      <span className="font-bold">{t.jumlah} unit</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Peserta / Pendamping Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex border-2 border-event-navy overflow-hidden mb-2 relative">
                <button
                  type="button"
                  onClick={() => setTab('peserta')}
                  className={`flex-1 py-2 font-body font-bold text-xs transition-colors relative ${
                    tab === 'peserta' ? 'bg-event-blue text-white' : 'bg-white text-event-navy hover:bg-event-blue/5'
                  }`}
                >
                  Peserta ({pesertaList.length})
                  {tab === 'peserta' && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-event-yellow"
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('pendamping')}
                  className={`flex-1 py-2 font-body font-bold text-xs transition-colors relative ${
                    tab === 'pendamping' ? 'bg-event-pink text-white' : 'bg-white text-event-navy hover:bg-event-pink/5'
                  }`}
                >
                  Pendamping ({pendampingList.length})
                  {tab === 'pendamping' && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-event-yellow"
                    />
                  )}
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                <AnimatePresence mode="wait">
                  {(tab === 'peserta' ? pesertaList : pendampingList).length === 0 ? (
                    <motion.p
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-body text-xs text-event-navy/50 text-center py-4"
                    >
                      Tidak ada data
                    </motion.p>
                  ) : (
                    (tab === 'peserta' ? pesertaList : pendampingList).map((p, idx) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,248,231,0.5)' }}
                        className="flex items-center gap-2.5 border-2 border-event-navy/20 p-2.5 bg-white/60 backdrop-blur-sm hover:shadow-pixel-sm transition-all"
                      >
                        {p.fotoUrl && (
                          <div className="relative w-10 h-10 border-2 border-event-navy shrink-0 overflow-hidden bg-event-cream">
                            <Image src={p.fotoUrl} alt={p.namaLengkap} fill className="object-cover" />
                          </div>
                        )}
                       <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-body font-bold text-xs text-event-navy truncate">
                        {p.namaLengkap}
                      </p>
                      {p.riwayatPenyakit && RIWAYAT_PENYAKIT_PERLU_PERHATIAN.includes(p.riwayatPenyakit) && (
                        <span
                          title={RIWAYAT_PENYAKIT_OPTIONS.find((o) => o.value === p.riwayatPenyakit)?.label}
                        >
                          <AlertTriangle size={12} className="text-pmi-red shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="font-body text-[10px] text-event-navy/50">
                      {findLabel(GENDER_OPTIONS, p.gender)} · {findLabel(AGAMA_OPTIONS, p.agama)} ·{' '}
                      {findLabel(GOLONGAN_DARAH_OPTIONS, p.golonganDarah)}
                    </p>
                  </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Excel Download */}
            {data.excelUrl && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <motion.a
                  href={data.excelUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="block border-2 border-event-navy bg-white px-3 py-2.5 text-center font-body text-xs font-bold text-event-navy hover:bg-event-cream transition-colors shadow-pixel-sm hover:shadow-pixel-md"
                >
                  📊 Download Excel Rekap
                </motion.a>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}