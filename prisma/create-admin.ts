import { PrismaClient, AdminRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const username = process.argv[2]
  const password = process.argv[3]
  const nama = process.argv[4]
  const roleInput = process.argv[5]?.toUpperCase()

  if (!username || !password || !nama || !roleInput) {
    console.log(`
      ❌ Pemakaian salah. Format: 
      npx tsx prisma/create-admin.ts <username> <password> <nama> <ROLE>
      
      Contoh: 
      npx tsx prisma/create-admin.ts kta kta1945 "KTA" KTA
    `)
    process.exit(1)
  }

  // Validasi Role
  const validRoles = ['SUPERADMIN', 'KESEKRETARIATAN', 'KEUANGAN', 'ACARA']
  if (!validRoles.includes(roleInput)) {
    console.log(`❌ Role tidak valid. Pilihan: ${validRoles.join(', ')}`)
    process.exit(1)
  }

  // Cek duplikat username
  const existing = await prisma.admin.findUnique({ where: { username } })
  if (existing) {
    console.log(`❌ Username "${username}" sudah dipakai. Gunakan username lain.`)
    process.exit(1)
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // Buat admin - Sekarang pakai `as AdminRole`, bukan `as any`
  await prisma.admin.create({
    data: {
      username,
      passwordHash,
      nama,
      role: roleInput as AdminRole,
    },
  })

  console.log(`✅ Akun admin berhasil dibuat!`)
  console.log(`   Username: ${username}`)
  console.log(`   Nama: ${nama}`)
  console.log(`   Role: ${roleInput}`)
  console.log(`   (Password: ${password})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })