'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ASAL_UNIT_OPTIONS, DIVISI_OPTIONS, GENDER_OPTIONS } from '@/lib/constants'
import type { PanitiaData } from './panitia-detail-modal'

export interface PanitiaUpdated {
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
}

export function PanitiaEditModal({
  panitia,
  isOpen,
  onClose,
  onSaved,
}: {
  panitia: PanitiaData | null
  isOpen: boolean
  onClose: () => void
  onSaved: (updated: PanitiaUpdated) => void
}) {
  // State diinisialisasi dari data panitia; parent me-remount modal
  // via key={panitia.id} setiap kali dibuka untuk panitia berbeda.
  const [nama, setNama] = useState(panitia?.nama ?? '')
  const [gender, setGender] = useState(panitia?.gender ?? '')
  const [noWhatsapp, setNoWhatsapp] = useState(panitia?.noWhatsapp ?? '')
  const [alamat, setAlamat] = useState(panitia?.alamat ?? '')
  const [asalUnit, setAsalUnit] = useState(panitia?.asalUnit ?? '')
  const [divisi, setDivisi] = useState(panitia?.divisi ?? '')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function handleFotoChange(file: File | null) {
    setFotoFile(file)
    setFotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
  }

  async function handleSubmit() {
    if (!panitia) return
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.set('nama', nama.trim())
      formData.set('gender', gender)
      formData.set('noWhatsapp', noWhatsapp.trim())
      formData.set('alamat', alamat.trim())
      formData.set('asalUnit', asalUnit)
      formData.set('divisi', divisi)
      if (fotoFile) formData.set('foto', fotoFile)

      const res = await fetch(`/api/panitia/${panitia.id}`, { method: 'PUT', body: formData })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan perubahan')
      toast.success('Data diperbarui, ID Card dibuat ulang otomatis')
      onSaved(result.data)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!isSaving) onClose() }}
      title={panitia ? `EDIT PANITIA - ${panitia.nomorRegistrasi}` : 'EDIT PANITIA'}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 border-3 border-event-navy shrink-0 overflow-hidden bg-event-cream">
            <Image
              src={fotoPreview ?? panitia?.fotoUrl ?? ''}
              alt={panitia?.nama ?? 'Foto panitia'}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <label className="font-body font-bold text-[11px] text-event-navy/60 block mb-1.5" htmlFor="edit-foto-panitia">
              Ganti Foto (opsional)
            </label>
            <input
              id="edit-foto-panitia"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              disabled={isSaving}
              onChange={(e) => handleFotoChange(e.target.files?.[0] ?? null)}
              className="w-full font-body text-xs text-event-navy file:mr-2 file:px-3 file:py-1.5 file:border-2 file:border-event-navy file:bg-event-yellow file:font-body file:text-xs file:font-bold file:text-event-navy disabled:opacity-50"
            />
            <p className="font-body text-[10px] text-event-navy/50 mt-1">JPG/PNG maks. 5MB. ID Card dibuat ulang otomatis setelah disimpan.</p>
          </div>
        </div>

        <Input label="Nama Lengkap" value={nama} onChange={(e) => setNama(e.target.value)} disabled={isSaving} />
        <Select
          placeholder="Pilih Jenis Kelamin"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          options={[...GENDER_OPTIONS]}
        />
        <Input label="No. WhatsApp" value={noWhatsapp} onChange={(e) => setNoWhatsapp(e.target.value)} disabled={isSaving} />
        <Input label="Alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} disabled={isSaving} />
        <Select
          placeholder="Pilih Asal Unit"
          value={asalUnit}
          onChange={(e) => setAsalUnit(e.target.value)}
          options={[...ASAL_UNIT_OPTIONS]}
        />
        <Select
          placeholder="Pilih Divisi"
          value={divisi}
          onChange={(e) => setDivisi(e.target.value)}
          options={[...DIVISI_OPTIONS]}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Batal</Button>
          <Button type="button" onClick={() => void handleSubmit()} isLoading={isSaving}>Simpan Perubahan</Button>
        </div>
      </div>
    </Modal>
  )
}
