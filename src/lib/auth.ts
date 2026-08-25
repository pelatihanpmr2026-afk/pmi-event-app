import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { AdminRoleType } from './admin-role' // <-- Import dari sini, bukan export dari sini

const JWT_ALG = 'HS256'
export const SESSION_COOKIE = 'pmi_admin_session'
export const SESSION_MAX_AGE = 60 * 60 * 8 // 8 jam

// Fail-fast di produksi: tanpa JWT_SECRET, sesi ditandatangani dengan secret
// publik (dev) sehingga bisa dipalsukan. Lebih baik layanan menolak request
// daripada membiarkan sesi palsu valid. Di dev, fallback dipakai dengan warning.
function resolveJwtSecret(): Uint8Array {
  const value = process.env.JWT_SECRET
  if (value) return new TextEncoder().encode(value)
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET wajib diatur di production. Tolak layanan daripada menandatangani sesi dengan secret dev yang publik.'
    )
  }
  console.warn('[auth] Peringatan: JWT_SECRET tidak diatur — memakai secret dev yang TIDAK aman.')
  return new TextEncoder().encode('dev-secret-jangan-dipakai-di-production')
}

export interface SessionPayload {
  adminId: string
  username: string
  nama: string
  role: AdminRoleType
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = resolveJwtSecret()
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret)
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = resolveJwtSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}