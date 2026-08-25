import { SignJWT, jwtVerify } from 'jose'

export const TENDA_SESSION_COOKIE = 'pmr_tenda_access'
export const TENDA_SESSION_MAX_AGE = 60 * 60 * 4
const encoder = new TextEncoder()

function secret() {
  const value = process.env.AUTH_SECRET || process.env.JWT_SECRET
  if (!value) throw new Error('AUTH_SECRET atau JWT_SECRET wajib diatur')
  return encoder.encode(value)
}

export async function createTendaSessionToken(sekolahId: string) {
  return new SignJWT({ sekolahId, purpose: 'sewa-tenda' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${TENDA_SESSION_MAX_AGE}s`).sign(secret())
}

export async function hasTendaSession(token: string | undefined, sekolahId: string) {
  if (!token) return false
  try { const { payload } = await jwtVerify(token, secret()); return payload.purpose === 'sewa-tenda' && payload.sekolahId === sekolahId } catch { return false }
}
