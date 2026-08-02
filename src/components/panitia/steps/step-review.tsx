import { UseFormReturn } from 'react-hook-form'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { PanitiaFormValues } from '@/lib/validations/panitia'
import { ASAL_UNIT_OPTIONS, DIVISI_OPTIONS, GENDER_OPTIONS } from '@/lib/constants'

function findLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((opt) => opt.value === value)?.label ?? '-'
}

export function StepReview({ form }: { form: UseFormReturn<PanitiaFormValues> }) {
  const values = form.watch()
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (values.foto instanceof File) {
      const url = URL.createObjectURL(values.foto)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [values.foto])

  const rows = [
    { label: 'Nama Lengkap', value: values.nama },
    { label: 'Jenis Kelamin', value: findLabel(GENDER_OPTIONS, values.gender) },
    { label: 'Nomor WhatsApp', value: values.noWhatsapp },
    { label: 'Alamat', value: values.alamat },
    { label: 'Asal Unit', value: findLabel(ASAL_UNIT_OPTIONS, values.asalUnit) },
    { label: 'Divisi', value: findLabel(DIVISI_OPTIONS, values.divisi) },
  ]

  return (
    <div className="flex flex-col gap-5">
      <p className="font-body font-bold text-sm text-event-navy text-center">
        Periksa kembali data sebelum mengirim pendaftaran
      </p>

      {preview && (
        <div className="w-40 h-40 mx-auto border-3 border-event-navy shadow-pixel relative overflow-hidden">
          <Image src={preview} alt="Foto panitia" fill className="object-cover" />
        </div>
      )}

      <div className="border-3 border-event-navy">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex flex-col sm:flex-row sm:items-center px-4 py-3 ${
              i !== rows.length - 1 ? 'border-b-3 border-event-navy' : ''
            }`}
          >
            <span className="font-body font-bold text-xs text-event-navy/60 w-full sm:w-40 shrink-0">
              {row.label}
            </span>
            <span className="font-body text-sm text-event-navy break-words">{row.value || '-'}</span>
          </div>
        ))}
      </div>

      <div className="bg-event-yellow/30 border-3 border-event-navy p-4">
        <p className="font-body text-xs text-event-navy">
          ⚠️ Pastikan data sudah benar. Setelah dikirim, QR Code dan ID Card akan digenerate
          otomatis berdasarkan data ini.
        </p>
      </div>
    </div>
  )
}