import { z } from 'zod'

export const tendaPilihanSchema = z.object({
  tendaJenisId: z.string(),
  jumlah: z.number().int().min(1),
})

export const tendaSelectionSchema = z.object({
  pilihan: z.array(tendaPilihanSchema),
}).superRefine(({ pilihan }, ctx) => {
  const ids = new Set<string>()

  pilihan.forEach((pilihanTenda, index) => {
    if (ids.has(pilihanTenda.tendaJenisId)) {
      ctx.addIssue({ code: 'custom', path: ['pilihan', index, 'tendaJenisId'], message: 'Satu jenis tenda hanya boleh dipilih sekali' })
    }
    ids.add(pilihanTenda.tendaJenisId)
  })
})

export type TendaPilihanValues = z.infer<typeof tendaPilihanSchema>
export type TendaSelectionValues = z.infer<typeof tendaSelectionSchema>
