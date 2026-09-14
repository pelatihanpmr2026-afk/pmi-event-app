'use client'

import { useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'
import { ACCEPTED_FOTO_TYPES } from '@/lib/constants'
import { compressImage } from '@/lib/compress-image'

export function ParticipantPhotoUpload({
  value,
  onChange,
  error,
}: {
  value: File | undefined
  onChange: (file: File | undefined) => void
  error?: string
}) {
const inputRef = useRef<HTMLInputElement>(null)

const preview = useMemo(() => {
  if (value instanceof File) return URL.createObjectURL(value)
  return null
}, [value])

useEffect(() => {
  return () => {
    if (preview) URL.revokeObjectURL(preview)
  }
}, [preview])

  function handleFile(file: File) {
    const accepted = Array.from(ACCEPTED_FOTO_TYPES)
    if (!accepted.includes(file.type)) return
    // Simpan file asli DULU, sinkron — supaya preview muncul langsung dan
    // value form terisi seketika. Kalau ditunggu sampai kompresi selesai
    // (bisa 0,5-2 detik di HP lambat), user bisa menekan "Lanjut" duluan
    // dan foto peserta jadi undefined saat dikirim → tidak pernah masuk
    // draft → "foto hilang" saat pendaftaran dilanjutkan.
    onChange(file)
    // Kompresi berjalan di latar belakang untuk memperkecil payload
    // pendaftaran (foto HP mentah bisa 3-8MB; dengan ±60 peserta total bisa
    // 100-300MB → ditolak Nginx 413 → error "Unexpected token '<'").
    void compressImage(file, 1200, 0.85)
      .then((compressed) => {
        // Ganti dengan hasil kompresi hanya kalau hasilnya lebih kecil &
        // valid (hindari blob kosong/gagal yang bikin preview rusak).
        if (compressed.size > 0 && compressed.size < file.size) onChange(compressed)
      })
      .catch(() => {
        // Gagal kompres → pakai file asli (sudah ter-set di atas)
      })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleFile(file)
  }

  // Paste foto (Ctrl+V) di samping klik-upload. Bekerja saat clipboard berisi
  // file gambar (paste dari Explorer) maupun gambar mentah dari screenshot /
  // copy dari web / WA. Wajib ada fokus di area foto (tabIndex) karena browser
  // hanya mengirim event paste ke elemen yang sedang fokus.
  function handlePaste(e: React.ClipboardEvent) {
    const clipboard = e.clipboardData
    if (!clipboard) return
    const accepted = Array.from(ACCEPTED_FOTO_TYPES)
    let file = Array.from(clipboard.files ?? []).find((f) => accepted.includes(f.type))
    if (!file) {
      const item = Array.from(clipboard.items ?? []).find((item) => item.type.startsWith('image/'))
      file = item ? item.getAsFile() ?? undefined : undefined
    }
    if (!file) {
      // Ada isi clipboard tapi bukan foto JPG/PNG — biarkan browser menangani.
      return
    }
    e.preventDefault()
    handleFile(file)
  }

  function handleRemove() {
    onChange(undefined)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-body font-bold text-xs text-event-navy">Foto <span className="font-normal text-event-navy/50">(opsional)</span></span>
      {!preview ? (
        <label
          tabIndex={0}
          onPaste={handlePaste}
          className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed py-5 cursor-pointer transition-colors focus:outline-none ${
            error ? 'border-pmi-red bg-pmi-red/5' : 'border-event-navy/40 bg-event-cream/50 hover:bg-event-cream'
          }`}
        >
          <Upload size={18} className="text-event-navy/60" />
          <span className="font-body text-[10px] text-event-navy/60">Klik untuk upload (JPG/PNG), atau Ctrl+V untuk paste foto</span>
          <span className="font-body text-[10px] text-event-navy/40">Wajah jelas dan pencahayaan cukup</span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FOTO_TYPES.join(',')}
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="relative w-20 h-20">
          <div
            tabIndex={0}
            onPaste={handlePaste}
            title="Klik area foto lalu Ctrl+V untuk paste/ganti foto"
            className="w-20 h-20 border-2 border-event-navy overflow-hidden relative cursor-pointer focus:outline-none"
          >
            <Image src={preview} alt="Preview" fill className="object-cover" />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-pmi-red text-white border-2 border-event-navy w-6 h-6 flex items-center justify-center"
          >
            <X size={12} />
          </button>
          <label className="absolute -bottom-7 left-0 whitespace-nowrap cursor-pointer font-body text-[10px] text-event-blue underline">Ganti foto<input ref={inputRef} type="file" accept={ACCEPTED_FOTO_TYPES.join(',')} className="hidden" onChange={handleFileChange} /></label>
        </div>
      )}
      {error && <p className="text-[11px] font-bold text-pmi-red">{error}</p>}
    </div>
  )
}
