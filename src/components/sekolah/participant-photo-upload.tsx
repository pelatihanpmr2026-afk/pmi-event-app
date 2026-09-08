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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Kompres foto dari HP agar payload pendaftaran tidak membengkak.
    // Sebelumnya foto dikirim asli (bisa 3-8MB/file) — dengan ±60 peserta,
    // total bisa 100-300MB sehingga ditolak Nginx (413) dan user mendapat
    // error "Unexpected token '<'" / "Respons server tidak valid".
    try {
      onChange(await compressImage(file, 1200, 0.85))
    } catch {
      onChange(file)
    }
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
          className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed py-5 cursor-pointer transition-colors ${
            error ? 'border-pmi-red bg-pmi-red/5' : 'border-event-navy/40 bg-event-cream/50 hover:bg-event-cream'
          }`}
        >
          <Upload size={18} className="text-event-navy/60" />
          <span className="font-body text-[10px] text-event-navy/60">Upload jika ada (JPG/PNG), wajah jelas dan pencahayaan cukup</span>
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
          <div className="w-20 h-20 border-2 border-event-navy overflow-hidden relative">
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
