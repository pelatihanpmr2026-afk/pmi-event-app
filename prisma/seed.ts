import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { TENDA_SEED_DATA } from '../src/lib/constants-sekolah'

const prisma = new PrismaClient()

async function main() {
  const username = 'admin'
  const password = 'admin123'
  const nama = 'Administrator'

  const existingAdmin = await prisma.admin.findUnique({ where: { username } })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.admin.create({ data: { username, passwordHash, nama } })
    console.log('Akun admin berhasil dibuat: admin / admin123')
  } else {
    console.log('Akun admin sudah ada, seeding admin dilewati.')
  }

  const existingTenda = await prisma.tendaJenis.count()
  if (existingTenda === 0) {
    await prisma.tendaJenis.createMany({ data: TENDA_SEED_DATA })
    console.log(`${TENDA_SEED_DATA.length} jenis tenda berhasil di-seed.`)
  } else {
    console.log('Data tenda sudah ada, seeding tenda dilewati.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })