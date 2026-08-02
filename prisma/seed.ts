import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const username = 'admin'
  const password = 'admin123'
  const nama = 'KESEKRETARIATAN'

  const existing = await prisma.admin.findUnique({ where: { username } })

  if (existing) {
    console.log('Akun admin dengan username tersebut sudah ada, seeding dilewati.')
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.admin.create({
    data: { username, passwordHash, nama },
  })

  console.log('Akun admin berhasil dibuat:')
  console.log('Username:', username)
  console.log('Password:', password)
  console.log('PENTING: segera ganti password ini setelah login pertama kali.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })