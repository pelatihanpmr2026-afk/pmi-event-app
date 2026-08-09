import { z } from 'zod'

export const tendaPilihanSchema = z.object({
  tendaJenisId: z.string(),
  jumlah: z.number().int().min(1),
})

export const tendaSelectionSchema = z.object({
  pilihan: z.array(tendaPilihanSchema),
})

export type TendaPilihanValues = z.infer<typeof tendaPilihanSchema>
export type TendaSelectionValues = z.infer<typeof tendaSelectionSchema>