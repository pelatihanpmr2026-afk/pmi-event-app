import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'
import { loginSchema } from '@/lib/validations/auth'
import { logAdminAction } from '@/lib/admin-log'
import { isRateLimited, recordFailedAttempt, resetAttempts } from '@/lib/rate-limit'

// Kredensial default yang dihasilkan seed dulu (dan yang harus diganti).
// Ditolak tegas di produksi agar akun tidak tertinggal dengan password lemah.
const DEFAULT_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'admin123'

function clientKey(req: NextRequest, username: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  return `${ip}:${username.toLowerCase()}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Data tidak valid' }, { status: 400 })
    }

    const { username, password } = parsed.data
    const key = clientKey(req, username)

    if (isRateLimited(key)) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.' },
        { status: 429 }
      )
    }

    // Tolak kredensial default pada produksi — paksa rotasi password.
    if (
      process.env.NODE_ENV === 'production' &&
      username === DEFAULT_USERNAME &&
      password === DEFAULT_PASSWORD
    ) {
      return NextResponse.json(
        { success: false, message: 'Password default diblokir. Ganti password admin segera.' },
        { status: 403 }
      )
    }

    const admin = await prisma.admin.findUnique({ where: { username } })

    if (!admin) {
      recordFailedAttempt(key)
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, admin.passwordHash)

    if (!isValid) {
      recordFailedAttempt(key)
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
        { status: 401 }
      )
    }

    resetAttempts(key)

    const token = await createSessionToken({
      adminId: admin.id,
      username: admin.username,
      nama: admin.nama,
      role: admin.role,
    })

     await logAdminAction(
    admin.id,
    admin.nama,
    admin.role,
    'LOGIN',
    { metadata: { username } }
  )

    const response = NextResponse.json({ success: true, message: 'Login berhasil' })
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[POST /api/auth/login]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}