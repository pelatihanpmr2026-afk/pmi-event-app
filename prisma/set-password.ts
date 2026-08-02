import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const username = process.argv[2]
  const newPassword = process.argv[3]

  if (!username || !newPassword) {
    console.log('Pemakaian: npx tsx prisma/set-password.ts <username> <password_baru>')
    process.exit(1)
  }

  if (newPassword.length < 8) {
    console.log('Password minimal 8 karakter.')
    process.exit(1)
  }

  const admin = await prisma.admin.findUnique({ where: { username } })
  if (!admin) {
    console.log(`Admin dengan username '${username}' tidak ditemukan.`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await prisma.admin.update({
    where: { username },
    data: { passwordHash },
  })

  console.log(`Password untuk '${username}' berhasil diubah.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })