import { SignJWT, jwtVerify } from 'jose'

export const SUSULAN_SESSION_COOKIE = 'pmi_susulan_session'
export const SUSULAN_SESSION_MAX_AGE = 60 * 30

interface SusulanSessionPayload {
  sekolahId: string
  purpose: 'pendaftaran-susulan'
}

// Fail-fast di produksi: tanpa secret, token susulan bisa dipalsukan.
function resolveSusulanSecret(): Uint8Array {
  const value = process.env.SUSULAN_JWT_SECRET || process.env.JWT_SECRET
  if (value) return new TextEncoder().encode(value)
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SUSULAN_JWT_SECRET (atau JWT_SECRET) wajib diatur di production. Tolak layanan daripada memakai secret dev yang publik.'
    )
  }
  console.warn('[susulan-session] Peringatan: secret token susulan tidak diatur — memakai secret dev yang TIDAK aman.')
  return new TextEncoder().encode('dev-secret-jangan-dipakai-di-production')
}

export async function createSusulanSessionToken(sekolahId: string): Promise<string> {
  return new SignJWT({ sekolahId, purpose: 'pendaftaran-susulan' satisfies SusulanSessionPayload['purpose'] })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SUSULAN_SESSION_MAX_AGE}s`)
    .sign(resolveSusulanSecret())
}

export async function verifySusulanSessionToken(token: string, sekolahId: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, resolveSusulanSecret())
    return payload.purpose === 'pendaftaran-susulan' && payload.sekolahId === sekolahId
  } catch {
    return false
  }
}
