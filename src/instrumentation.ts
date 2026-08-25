/**
 * Boot-time hook Next.js (instrumentation).
 * Assertion keamanan secret (production): gagal konfigurasi mematikan server
 * di production daripada menandatangani token dengan secret dev.
 */

const DEV_FALLBACK = 'dev-secret-jangan-dipakai-di-production'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  if (process.env.NODE_ENV === 'production') {
    const problems: string[] = []

    const jwt = process.env.JWT_SECRET
    if (!jwt) {
      problems.push('JWT_SECRET tidak diatur')
    } else if (jwt === DEV_FALLBACK) {
      problems.push('JWT_SECRET masih memakai fallback dev')
    }

    const susulan = process.env.SUSULAN_JWT_SECRET
    if (!susulan && !jwt) {
      problems.push('SUSULAN_JWT_SECRET (atau JWT_SECRET) tidak diatur')
    } else if (susulan === DEV_FALLBACK) {
      problems.push('SUSULAN_JWT_SECRET masih memakai fallback dev')
    }

    if (problems.length > 0) {
      throw new Error(`[boot] Konfigurasi secret tidak aman: ${problems.join('; ')}`)
    }
  }
}
