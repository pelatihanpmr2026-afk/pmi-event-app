'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { RadioPixel } from '@/components/ui/radio-pixel'
import { Button } from '@/components/ui/button'
import {
  transaksiKeuanganSchema,
  TransaksiKeuanganFormValues,
} from '@/lib/validations/transaksi-keuangan'
import {
  KATEGORI_PEMASUKAN_OPTIONS,
  KATEGORI_PENGELUARAN_OPTIONS,
  DIVISI_OPTIONS,
  PIC_PER_DIVISI,
} from '@/lib/constants-keuangan'

export interface TransaksiData {
  id: string
  tanggal: string
  keterangan: string
  uraian: string
  jenis: 'PEMASUKAN' | 'PENGELUARAN' | 'UTANG'
  kategoriPemasukan: string | null
  kategoriPengeluaran: string | null
  debit: number
  kredit: number
  utang: number
  saldo: number
  divisi: string | null
  pic: string | null
}

const JENIS_OPTIONS = [
  { value: 'PEMASUKAN', label: 'Pemasukan' },
  { value: 'PENGELUARAN', label: 'Pengeluaran' },
  { value: 'UTANG', label: 'Utang' },
] as const

export function TransaksiFormModal({
  isOpen,
  onClose,
  editing,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  editing: TransaksiData | null
  onSaved: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransaksiKeuanganFormValues>({
    resolver: zodResolver(transaksiKeuanganSchema),
  })

  useEffect(() => {
    if (!isOpen) return

    if (editing) {
      const nominalValue =
        editing.jenis === 'PEMASUKAN'
          ? editing.debit
          : editing.jenis === 'PENGELUARAN'
            ? editing.kredit
            : editing.utang

      reset({
        tanggal: editing.tanggal.slice(0, 10),
        keterangan: editing.keterangan,
        jenis: editing.jenis,
        kategoriPemasukan:
          (editing.kategoriPemasukan as TransaksiKeuanganFormValues['kategoriPemasukan']) ?? undefined,
        kategoriPengeluaran:
          (editing.kategoriPengeluaran as TransaksiKeuanganFormValues['kategoriPengeluaran']) ??
          undefined,
        nominal: String(nominalValue),
        divisi: editing.divisi ?? undefined,
        pic: editing.pic ?? undefined,
      })
    } else {
      reset({
        tanggal: new Date().toISOString().slice(0, 10),
        keterangan: '',
        jenis: undefined,
        kategoriPemasukan: undefined,
        kategoriPengeluaran: undefined,
        nominal: '',
        divisi: undefined,
        pic: undefined,
      })
    }
  }, [isOpen, editing, reset])

  const jenis = watch('jenis')
  const kategoriPengeluaran = watch('kategoriPengeluaran')
  const divisi = watch('divisi')

  const isOperasionalDivisi = jenis === 'PENGELUARAN' && kategoriPengeluaran === 'OPERASIONAL_DIVISI'
  const picOptions = divisi ? (PIC_PER_DIVISI[divisi] ?? []) : []

  async function onSubmit(values: TransaksiKeuanganFormValues) {
    setIsSubmitting(true)
    try {
      const url = editing ? `/api/keuangan/transaksi/${editing.id}` : '/api/keuangan/transaksi'
      const method = editing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await res.json()

      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan transaksi')

      toast.success(editing ? 'Transaksi berhasil diperbarui' : 'Transaksi berhasil ditambahkan')
      onSaved()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'EDIT TRANSAKSI' : 'TAMBAH TRANSAKSI'}>
      <AnimatePresence mode="wait">
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Tanggal"
              type="date"
              error={errors.tanggal?.message}
              {...register('tanggal')}
              className="border-2 border-event-navy bg-white/80"
            />

            <Input
              label="Keterangan"
              placeholder="Contoh: Pembayaran pendaftaran SMAN 1 Cianjur (tunai)"
              error={errors.keterangan?.message}
              {...register('keterangan')}
              className="border-2 border-event-navy bg-white/80"
            />

            <RadioPixel
              label="Jenis Transaksi"
              name="jenis"
              options={JENIS_OPTIONS}
              value={jenis}
              onChange={(val) => {
                setValue('jenis', val as TransaksiKeuanganFormValues['jenis'], { shouldValidate: true })
                setValue('kategoriPemasukan', undefined)
                setValue('kategoriPengeluaran', undefined)
                setValue('divisi', undefined)
                setValue('pic', undefined)
              }}
              error={errors.jenis?.message}
            />

            {jenis === 'PEMASUKAN' && (
              <Select
                label="Kategori Pemasukan"
                placeholder="Pilih kategori"
                options={[...KATEGORI_PEMASUKAN_OPTIONS]}
                error={errors.kategoriPemasukan?.message}
                {...register('kategoriPemasukan')}
                className="border-2 border-event-navy bg-white/80"
              />
            )}

            {jenis === 'PENGELUARAN' && (
              <Select
                label="Kategori Pengeluaran"
                placeholder="Pilih kategori"
                options={[...KATEGORI_PENGELUARAN_OPTIONS]}
                error={errors.kategoriPengeluaran?.message}
                {...register('kategoriPengeluaran')}
                className="border-2 border-event-navy bg-white/80"
              />
            )}

            {isOperasionalDivisi && (
              <>
                <Select
                  label="Divisi"
                  placeholder="Pilih divisi"
                  options={[...DIVISI_OPTIONS]}
                  error={errors.divisi?.message}
                  {...register('divisi')}
                  className="border-2 border-event-navy bg-white/80"
                />

                {picOptions.length > 0 ? (
                  <Select
                    label="PIC"
                    placeholder="Pilih PIC"
                    options={picOptions.map((name) => ({ value: name, label: name }))}
                    error={errors.pic?.message}
                    {...register('pic')}
                    className="border-2 border-event-navy bg-white/80"
                  />
                ) : (
                  <Input
                    label="PIC"
                    placeholder={divisi ? 'Nama PIC belum terdaftar, isi manual' : 'Pilih divisi dulu'}
                    disabled={!divisi}
                    error={errors.pic?.message}
                    {...register('pic')}
                    className="border-2 border-event-navy bg-white/80"
                  />
                )}
              </>
            )}

            <Input
              label={
                jenis === 'PENGELUARAN'
                  ? 'Nominal Pengeluaran (Rp)'
                  : jenis === 'UTANG'
                    ? 'Nominal Utang (Rp)'
                    : 'Nominal Pemasukan (Rp)'
              }
              type="number"
              placeholder="500000"
              error={errors.nominal?.message}
              {...register('nominal')}
              className="border-2 border-event-navy bg-white/80"
            />

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="mt-2 w-full border-2 border-event-navy shadow-pixel-sm"
              >
                {editing ? 'Simpan Perubahan' : 'Tambah Transaksi'}
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </AnimatePresence>
    </Modal>
  )
}