import { useState, useEffect, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'
import { PanitiaFormValues } from '@/lib/validations/panitia'
import { ACCEPTED_FOTO_TYPES, MAX_FOTO_SIZE } from '@/lib/constants'

export function StepFoto({ form }: { form: UseFormReturn<PanitiaFormValues> }) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form

  const foto = watch('foto')
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (foto instanceof File) {
      const url = URL.createObjectURL(foto)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreview(null)
  }, [foto])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setValue('foto', file, { shouldValidate: true })
    }
  }

  function handleRemove() {
    setValue('foto', undefined as unknown as File, { shouldValidate: true })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body font-bold text-sm text-event-navy">
        Upload Foto (Formal/Non-Formal) untuk ID Card
      </p>

      {!preview ? (
        <label
          htmlFor="foto"
          className="flex flex-col items-center justify-center gap-3 border-3 border-dashed border-event-navy bg-event-cream/50 py-12 cursor-pointer hover:bg-event-cream transition-colors"
        >
          <Upload size={32} className="text-event-navy" />
          <span className="font-body text-sm font-bold text-event-navy">
            Klik untuk upload foto
          </span>
          <span className="font-body text-xs text-event-navy/60">
            Format JPG/PNG, maksimal 5MB
          </span>
          <input
            ref={inputRef}
            id="foto"
            type="file"
            accept={ACCEPTED_FOTO_TYPES.join(',')}
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="relative w-fit mx-auto">
          <div className="border-3 border-event-navy shadow-pixel-lg overflow-hidden w-56 h-56 relative">
            <Image src={preview} alt="Preview foto" fill className="object-cover" />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-3 -right-3 bg-pmi-red text-white border-3 border-event-navy w-8 h-8 flex items-center justify-center hover:bg-red-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {errors.foto?.message && (
        <p className="text-xs font-bold text-pmi-red text-center">{errors.foto.message as string}</p>
      )}

      <div className="bg-event-cream border-3 border-event-navy p-4">
        <p className="font-body text-xs text-event-navy/70">
          📸 Gunakan foto dengan pencahayaan jelas dan wajah terlihat penuh — foto ini akan
          langsung dipakai untuk ID Card event.
        </p>
      </div>
    </div>
  )
}