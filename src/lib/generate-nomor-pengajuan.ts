import { prisma } from './prisma'

export async function generateNomorPengajuan(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `PA-${year}`

  const last = await prisma.pengajuanAnggaran.findFirst({
    where: { nomorPengajuan: { startsWith: prefix } },
    orderBy: { nomorPengajuan: 'desc' },
  })

  let next = 1
  if (last) {
    const lastNum = parseInt(last.nomorPengajuan.split('-').pop() ?? '0', 10)
    next = lastNum + 1
  }

  return `${prefix}-${String(next).padStart(4, '0')}`
}