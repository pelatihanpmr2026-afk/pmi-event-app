import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioPixel } from '@/components/ui/radio-pixel'
import { GENDER_OPTIONS } from '@/lib/constants'
import { PanitiaFormValues } from '@/lib/validations/panitia'

export function StepBiodata({ form }: { form: UseFormReturn<PanitiaFormValues> }) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  return (
    <div className="flex flex-col gap-5">
      <Input
        id="nama"
        label="Nama Lengkap"
        placeholder="Contoh: Ahmad Fauzan"
        error={errors.nama?.message}
        {...register('nama')}
      />

      <RadioPixel
        label="Jenis Kelamin"
        name="gender"
        options={GENDER_OPTIONS}
        value={watch('gender')}
        onChange={(val) => setValue('gender', val as PanitiaFormValues['gender'], { shouldValidate: true })}
        error={errors.gender?.message}
      />

      <Input
        id="noWhatsapp"
        label="Nomor WhatsApp"
        placeholder="Contoh: 081234567890"
        error={errors.noWhatsapp?.message}
        {...register('noWhatsapp')}
      />

      <Textarea
        id="alamat"
        label="Alamat Lengkap"
        placeholder="Masukkan alamat domisili saat ini"
        error={errors.alamat?.message}
        {...register('alamat')}
      />
    </div>
  )
}