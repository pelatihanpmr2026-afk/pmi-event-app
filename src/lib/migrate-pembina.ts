import { prisma } from '@/lib/prisma'

export async function migratePembinaData() {
  const sekolahList = await prisma.sekolah.findMany({
    where: { namaPembina: { not: '' } },
    select: { id: true, namaPembina: true },
  })

  let created = 0
  let skipped = 0

  for (const sekolah of sekolahList) {
    const existing = await prisma.pembina.findFirst({
      where: { sekolahId: sekolah.id, nama: sekolah.namaPembina },
    })
    if (existing) {
      skipped++
      continue
    }
    await prisma.pembina.create({
      data: { sekolahId: sekolah.id, nama: sekolah.namaPembina },
    })
    created++
  }

  return { total: sekolahList.length, created, skipped }
}
