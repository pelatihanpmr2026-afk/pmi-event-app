import { SignJWT, jwtVerify } from 'jose'

// Sesi akses halaman pembayaran peserta — diset saat pendaftaran/susulan
// sukses, dipakai untuk melindungi endpoint UPLOAD bukti transfer (POST).
// GET (lihat status) sengaja tetap publik agar link yang dibagikan via
// WhatsApp bisa dibuka pembina tanpa login.
export const PAYMENT_SESSION_COOKIE = 'pmr_payment_access'
export const PAYMENT_SESSION_MAX_AGE = 60 * 60 * 24 * 30

const encoder = new TextEncoder()

function secret() {
  const value = process.env.AUTH_SECRET || process.env.JWT_SECRET
  if (!value) throw new Error('AUTH_SECRET atau JWT_SECRET wajib diatur')
  return encoder.encode(value)
}

export async function createPaymentSessionToken(sekolahId: string) {
  return new SignJWT({ sekolahId, purpose: 'pembayaran-peserta' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PAYMENT_SESSION_MAX_AGE}s`)
    .sign(secret())
}

export async function hasPaymentSession(token: string | undefined, sekolahId: string) {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload.purpose === 'pembayaran-peserta' && payload.sekolahId === sekolahId
  } catch {
    return false
  }
}