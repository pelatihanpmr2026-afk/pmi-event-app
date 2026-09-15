'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { UserPlus } from 'lucide-react'
import { ASAL_UNIT_OPTIONS, DIVISI_OPTIONS, GENDER_OPTIONS } from '@/lib/constants'
import type { PanitiaUpdated } from './panitia-edit-modal'

export function PanitiaAddModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  onSaved: (created: PanitiaUpdated) => void
}) {
  const [nama, setNama] = useState('')
  const [gender, setGender] = useState('')
  const [noWhatsapp, setNoWhatsapp] = useState('')
  const [alamat, setAlamat] = useState('')
  const [asalUnit, setAsalUnit] = useState('')
  const [divisi, setDivisi] = useState('')
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
    if (!nama.trim() || !gender || !noWhatsapp.trim() || !alamat.trim() || !asalUnit || !divisi) {
      toast.error('Lengkapi semua data terlebih dahulu')
      return
    }
    if (!fotoFile) {
      toast.error('Foto wajib diupload')
      return
    }
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.set('nama', nama.trim())
      formData.set('gender', gender)
      formData.set('noWhatsapp', noWhatsapp.trim())
      formData.set('alamat', alamat.trim())
      formData.set('asalUnit', asalUnit)
      formData.set('divisi', divisi)
      formData.set('foto', fotoFile)

      const res = await fetch('/api/panitia', { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menambahkan panitia')

      toast.success('Panitia berhasil ditambahkan, ID Card dibuat otomatis')
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
      title="TAMBAH PANITIA"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 border-3 border-event-navy shrink-0 overflow-hidden bg-event-cream flex items-center justify-center">
            {fotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPreview} alt="Foto panitia" className="w-full h-full object-cover" />
            ) : (
              <UserPlus className="text-gray-300" size={28} />
            )}
          </div>
          <div className="flex-1">
            <label className="font-body font-bold text-[11px] text-event-navy/60 block mb-1.5" htmlFor="add-foto-panitia">
              Foto Panitia
            </label>
            <input
              id="add-foto-panitia"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              disabled={isSaving}
              onChange={(e) => handleFotoChange(e.target.files?.[0] ?? null)}
              className="w-full font-body text-xs text-event-navy file:mr-2 file:px-3 file:py-1.5 file:border-2 file:border-event-navy file:bg-event-yellow file:font-body file:text-xs file:font-bold file:text-event-navy disabled:opacity-50"
            />
            <p className="font-body text-[10px] text-event-navy/50 mt-1">JPG/PNG maks. 5MB. Nama & ID Card dibuat otomatis.</p>
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
          <Button type="button" onClick={() => void handleSubmit()} isLoading={isSaving}>Tambah Panitia</Button>
        </div>
      </div>
    </Modal>
  )
}