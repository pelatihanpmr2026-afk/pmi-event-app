import { prisma } from './prisma'

export async function generateNomorRegistrasi(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PMI-${year}`

  const lastPanitia = await prisma.panitia.findFirst({
    where: {
      nomorRegistrasi: {
        startsWith: prefix,
      },
    },
    orderBy: {
      nomorRegistrasi: 'desc',
    },
  })

  let nextNumber = 1

  if (lastPanitia) {
    const lastNumberStr = lastPanitia.nomorRegistrasi.split('-').pop()
    const lastNumber = parseInt(lastNumberStr ?? '0', 10)
    nextNumber = lastNumber + 1
  }

  const paddedNumber = String(nextNumber).padStart(4, '0')
  return `${prefix}-${paddedNumber}`
}