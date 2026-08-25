import { PrismaClient, AdminRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { TENDA_SEED_DATA } from '../src/lib/constants-sekolah'

const prisma = new PrismaClient()

function generatePassword(length = 16): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length)
}

/** Buat akun admin dengan role tertentu dari env, kalau belum ada. */
async function seedAdminFromEnv(
  username: string | undefined,
  password: string | undefined,
  role: AdminRole,
  namaFallback: string
) {
  if (!username || !password) return
  const existing = await prisma.admin.findUnique({ where: { username } })
  if (existing) {
    console.log(`Akun admin ${username} sudah ada, seeding dilewati.`)
    return
  }
  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.admin.create({ data: { username, passwordHash, nama: namaFallback, role } })
  console.log(`Akun admin ${username} (${role}) dibuat.`)
}

async function main() {
  const envUsername = process.env.ADMIN_INITIAL_USERNAME
  const envPassword = process.env.ADMIN_INITIAL_PASSWORD

  // Jangan pernah mengunci default admin/admin123 secara diam-diam.
  const isWeakDefault = envUsername === 'admin' && envPassword === 'admin123'
  const username = envUsername || 'admin'
  const password = isWeakDefault || !envPassword ? generatePassword() : envPassword

  const existingAdmin = await prisma.admin.findUnique({ where: { username } })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.admin.create({ data: { username, passwordHash, nama: 'Administrator' } })
    if (isWeakDefault) {
      console.warn(
        'Peringatan: ADMIN_INITIAL_PASSWORD tidak boleh "admin123". Password acak dibuat.'
      )
    }
    console.log(`Akun admin dibuat.`)
    console.log(`  Username : ${username}`)
    if (envPassword && !isWeakDefault) {
      console.log(`  Password : (dari env ADMIN_INITIAL_PASSWORD)`)
    } else {
      console.log(`  Password : ${password}`)
      console.log('  SIMPAN password ini sekarang — tidak akan tampil lagi.')
    }
  } else {
    console.log('Akun admin sudah ada, seeding admin dilewati.')
  }

  // Akun KTA (cetak data peserta) opsional via env.
  await seedAdminFromEnv(
    process.env.KTA_INITIAL_USERNAME,
    process.env.KTA_INITIAL_PASSWORD,
    'KTA',
    'Petugas KTA'
  )

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