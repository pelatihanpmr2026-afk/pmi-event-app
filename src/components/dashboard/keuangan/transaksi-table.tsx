'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TransaksiFormModal, type TransaksiData } from './transaksi-form-modal'
import { DIVISI_OPTIONS } from '@/lib/constants'

function formatRp(n: number) {
  return n > 0 ? `Rp${n.toLocaleString('id-ID')}` : '-'
}

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function findDivisiLabel(value: string | null) {
  if (!value) return '-'
  return DIVISI_OPTIONS.find((d) => d.value === value)?.label ?? value
}

export function TransaksiTable({ initialData }: { initialData: TransaksiData[] }) {
  const [data, setData] = useState(initialData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<TransaksiData | null>(null)

  async function refresh() {
    const res = await fetch('/api/keuangan/transaksi')
    const result = await res.json()
    if (result.success) setData(result.data)
  }

  function openCreate() {
    setEditing(null)
    setIsModalOpen(true)
  }

  function openEdit(t: TransaksiData) {
    setEditing(t)
    setIsModalOpen(true)
  }

  async function handleDelete(id: string, keterangan: string) {
    if (!confirm(`Hapus transaksi "${keterangan}"?`)) return

    try {
      const res = await fetch(`/api/keuangan/transaksi/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menghapus transaksi')

      toast.success('Transaksi berhasil dihapus')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    }
  }

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h2 className="font-heading text-xs sm:text-sm text-event-navy">BUKU KAS</h2>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-event-blue text-white border-3 border-event-navy font-body font-bold text-xs shadow-pixel-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <Plus size={14} />
          Tambah Transaksi
        </motion.button>
      </motion.div>

      {data.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border-3 border-event-navy bg-white py-12 text-center"
        >
          <p className="font-body text-sm text-event-navy/50">Belum ada transaksi tercatat</p>
        </motion.div>
      )}

      {/* MOBILE */}
      {data.length > 0 && (
        <div className="md:hidden flex flex-col gap-3">
          <AnimatePresence>
            {data.map((t, i) => (
              <motion.div
                key={t.id}
                initial="hidden"
                animate="visible"
                variants={rowVariants}
                transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.01 }}
                className="border-3 border-event-navy bg-white p-4 flex flex-col gap-2 shadow-pixel-sm hover:shadow-pixel-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-body font-bold text-xs text-event-navy">{t.uraian}</p>
                    <p className="font-body text-[10px] text-event-navy/50">{formatTanggal(t.tanggal)}</p>
                  </div>
                  <Badge
                    variant={t.jenis === 'PEMASUKAN' ? 'success' : t.jenis === 'PENGELUARAN' ? 'danger' : 'warning'}
                  >
                    {t.jenis === 'PEMASUKAN' ? 'Pemasukan' : t.jenis === 'PENGELUARAN' ? 'Pengeluaran' : 'Utang'}
                  </Badge>
                </div>
                <p className="font-body text-xs text-event-navy/70">{t.keterangan}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-body">
                  <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                    <span className="text-event-navy/50 block">Debit</span>
                    <span className="font-bold text-event-navy">{formatRp(t.debit)}</span>
                  </div>
                  <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                    <span className="text-event-navy/50 block">Kredit</span>
                    <span className="font-bold text-event-navy">{formatRp(t.kredit)}</span>
                  </div>
                  <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                    <span className="text-event-navy/50 block">Saldo</span>
                    <span className="font-bold text-event-navy">{formatRp(t.saldo)}</span>
                  </div>
                  <div className="bg-event-cream px-2 py-1.5 border border-event-navy/20">
                    <span className="text-event-navy/50 block">Utang</span>
                    <span className="font-bold text-event-navy">{formatRp(t.utang)}</span>
                  </div>
                </div>
                {t.divisi && (
                  <p className="font-body text-[10px] text-event-navy/60">
                    {findDivisiLabel(t.divisi)} · PIC: {t.pic}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openEdit(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-event-yellow border-2 border-event-navy font-body font-bold text-xs shadow-pixel-sm"
                  >
                    <Pencil size={12} />
                    Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(t.id, t.keterangan)}
                    className="w-11 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy shadow-pixel-sm"
                  >
                    <Trash2 size={12} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* DESKTOP */}
      {data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden md:block border-3 border-event-navy overflow-x-auto bg-white shadow-pixel-lg"
        >
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-event-navy text-white">
                <th className="font-body text-xs px-2 py-3 w-10">No</th>
                <th className="font-body text-xs px-2 py-3 text-left">Tanggal</th>
                <th className="font-body text-xs px-2 py-3 text-left">Uraian</th>
                <th className="font-body text-xs px-2 py-3 text-left">Keterangan</th>
                <th className="font-body text-xs px-2 py-3 text-right">Debit</th>
                <th className="font-body text-xs px-2 py-3 text-right">Kredit</th>
                <th className="font-body text-xs px-2 py-3 text-right">Utang</th>
                <th className="font-body text-xs px-2 py-3 text-right">Saldo</th>
                <th className="font-body text-xs px-2 py-3 text-left">Divisi</th>
                <th className="font-body text-xs px-2 py-3 text-left">PIC</th>
                <th className="font-body text-xs px-2 py-3 w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {data.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial="hidden"
                    animate="visible"
                    variants={rowVariants}
                    transition={{ delay: i * 0.02 }}
                    className={`border-t-2 border-event-navy/10 hover:bg-event-blue/5 transition-colors ${
                      i % 2 === 1 ? 'bg-event-cream/40' : ''
                    }`}
                  >
                    <td className="px-2 py-2.5 text-center font-body text-xs text-event-navy/60">{i + 1}</td>
                    <td className="px-2 py-2.5 font-body text-xs text-event-navy">{formatTanggal(t.tanggal)}</td>
                    <td className="px-2 py-2.5 font-body text-xs font-bold text-event-navy">{t.uraian}</td>
                    <td className="px-2 py-2.5 font-body text-xs text-event-navy/70 max-w-[220px] truncate">
                      {t.keterangan}
                    </td>
                    <td className="px-2 py-2.5 font-body text-xs text-right text-event-navy">
                      {formatRp(t.debit)}
                    </td>
                    <td className="px-2 py-2.5 font-body text-xs text-right text-event-navy">
                      {formatRp(t.kredit)}
                    </td>
                    <td className="px-2 py-2.5 font-body text-xs text-right text-event-navy">
                      {formatRp(t.utang)}
                    </td>
                    <td className="px-2 py-2.5 font-body text-xs text-right font-bold text-event-navy">
                      {formatRp(t.saldo)}
                    </td>
                    <td className="px-2 py-2.5 font-body text-xs text-event-navy">{findDivisiLabel(t.divisi)}</td>
                    <td className="px-2 py-2.5 font-body text-xs text-event-navy">{t.pic ?? '-'}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openEdit(t)}
                          className="w-7 h-7 flex items-center justify-center bg-event-yellow border-2 border-event-navy shadow-pixel-sm"
                        >
                          <Pencil size={11} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(t.id, t.keterangan)}
                          className="w-7 h-7 flex items-center justify-center bg-pmi-red text-white border-2 border-event-navy shadow-pixel-sm"
                        >
                          <Trash2 size={11} />
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

      <TransaksiFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editing={editing}
        onSaved={refresh}
      />
    </div>
  )
}