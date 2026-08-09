'use client'

import { useState, useMemo } from 'react'
import { Search, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { JENJANG_OPTIONS, STATUS_PEMBAYARAN_CONFIG } from '@/lib/constants-sekolah'
import { SekolahDetailModal } from './sekolah-detail-modal'

interface SekolahListItem {
  id: string
  namaLengkap: string
  kodePendaftaran: string
  jenjang: string
  kategori: string
  namaPembina: string
  jumlahPeserta: number
  jumlahPendamping: number
  jumlahTenda: number
  pembayaranPeserta: { status: string; jumlahBiaya: number } | null
  pembayaranTenda: { status: string; jumlahBiaya: number } | null
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="font-body text-[10px] text-event-navy/30">-</span>
  const config = STATUS_PEMBAYARAN_CONFIG[status as keyof typeof STATUS_PEMBAYARAN_CONFIG]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function SekolahTable({ initialData }: { initialData: SekolahListItem[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [filterJenjang, setFilterJenjang] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Prepend a "Semua Jenjang" option to the list
  const jenjangOptions = useMemo(() => {
    return [{ value: '', label: 'Semua Jenjang' }, ...JENJANG_OPTIONS]
  }, [])

  const filtered = useMemo(() => {
    return data.filter((s) => {
      const matchSearch =
        search.trim() === '' ||
        s.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
        s.kodePendaftaran.toLowerCase().includes(search.toLowerCase())
      const matchJenjang = filterJenjang === '' || s.jenjang === filterJenjang
      return matchSearch && matchJenjang
    })
  }, [data, search, filterJenjang])

  function openDetail(id: string) {
    setSelectedId(id)
    setIsModalOpen(true)
  }

  async function refreshList() {
    const res = await fetch('/api/sekolah/list')
    const result = await res.json()
    if (result.success) setData(result.data)
  }

  // Table row animation variants
  const rowVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="flex flex-col gap-6 relative z-10">
      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-event-navy/30 size-4" />
          <Input
            placeholder="Cari nama sekolah atau kode pendaftaran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-2 border-event-navy bg-white/80 backdrop-blur-sm"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={filterJenjang}
            onChange={(e) => setFilterJenjang(e.target.value)}
            options={jenjangOptions}   // Contains the reset option
            className="border-2 border-event-navy bg-white/80 backdrop-blur-sm"
          />
        </div>
      </motion.div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border-3 border-event-navy bg-white/80 backdrop-blur-sm py-16 flex flex-col items-center gap-4"
        >
          <Search size={40} className="text-event-navy/20" />
          <p className="font-body text-base text-event-navy/50">Tidak ada data yang cocok</p>
        </motion.div>
      )}

      {/* Mobile Cards */}
      {filtered.length > 0 && (
        <div className="md:hidden flex flex-col gap-4">
          <AnimatePresence>
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial="hidden"
                animate="visible"
                variants={rowVariants}
                transition={{ delay: i * 0.05 }}
                className="border-3 border-event-navy bg-white/90 backdrop-blur-sm p-5 flex flex-col gap-4 shadow-pixel-sm hover:shadow-pixel-md transition-shadow"
              >
                <div>
                  <p className="font-body font-bold text-base text-event-navy">{s.namaLengkap}</p>
                  <p className="font-body text-xs text-event-navy/60">{s.kodePendaftaran}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default">{s.kategori}</Badge>
                  <span className="font-body text-xs text-event-navy/60">
                    {s.jumlahPeserta} peserta · {s.jumlahPendamping} pendamping
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-event-cream/80 px-3 py-2 border border-event-navy/20">
                    <span className="text-[10px] text-event-navy/50 block">Bayar Peserta</span>
                    <StatusBadge status={s.pembayaranPeserta?.status} />
                  </div>
                  <div className="bg-event-cream/80 px-3 py-2 border border-event-navy/20">
                    <span className="text-[10px] text-event-navy/50 block">Bayar Tenda</span>
                    <StatusBadge status={s.pembayaranTenda?.status} />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openDetail(s.id)}
                  className="flex items-center justify-center gap-2 py-2.5 bg-event-blue text-white border-2 border-event-navy font-body font-bold text-sm shadow-pixel-sm"
                >
                  <Eye size={16} />
                  Lihat Detail
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Desktop Table */}
      {filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="hidden md:block border-3 border-event-navy overflow-x-auto bg-white/90 backdrop-blur-sm shadow-pixel-lg"
        >
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-event-navy text-white">
                <th className="font-body text-xs text-left px-4 py-3 uppercase tracking-wider">Nama Sekolah</th>
                <th className="font-body text-xs text-left px-4 py-3 uppercase tracking-wider">Kode Pendaftaran</th>
                <th className="font-body text-xs text-center px-4 py-3 uppercase tracking-wider">Peserta</th>
                <th className="font-body text-xs text-center px-4 py-3 uppercase tracking-wider">Pendamping</th>
                <th className="font-body text-xs text-center px-4 py-3 uppercase tracking-wider">Bayar Peserta</th>
                <th className="font-body text-xs text-center px-4 py-3 uppercase tracking-wider">Bayar Tenda</th>
                <th className="font-body text-xs text-center px-4 py-3 uppercase tracking-wider w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial="hidden"
                    animate="visible"
                    variants={rowVariants}
                    transition={{ delay: i * 0.03 }}
                    className={`border-t-2 border-event-navy/10 hover:bg-event-blue/5 transition-colors ${
                      i % 2 === 1 ? 'bg-event-cream/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-body text-sm font-bold text-event-navy">
                      {s.namaLengkap}
                      <Badge variant="default" className="ml-2">
                        {s.kategori}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-event-navy/70">{s.kodePendaftaran}</td>
                    <td className="px-4 py-3 text-center font-body text-xs text-event-navy">{s.jumlahPeserta}</td>
                    <td className="px-4 py-3 text-center font-body text-xs text-event-navy">{s.jumlahPendamping}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={s.pembayaranPeserta?.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={s.pembayaranTenda?.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: -2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openDetail(s.id)}
                          className="w-9 h-9 flex items-center justify-center bg-event-blue text-white border-2 border-event-navy shadow-pixel-sm hover:shadow-pixel-md transition-all"
                        >
                          <Eye size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}

      <p className="font-body text-sm text-event-navy/60">
        Menampilkan {filtered.length} dari {data.length} total sekolah terdaftar
      </p>

      <SekolahDetailModal
        sekolahId={selectedId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDataChanged={refreshList}
      />
    </div>
  )
}