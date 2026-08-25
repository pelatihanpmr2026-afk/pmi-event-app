import { NextResponse } from 'next/server'
import { getSession } from './get-session'
import type { SessionPayload } from './auth'
import type { AdminRoleType } from './admin-role'

/**
 * Helper untuk penegakan otorisasi di layer API.
 *
 * Middleware (src/middleware.ts) HANYA melindungi halaman `/dashboard/*` dan
 * `/login` — endpoint `/api/*` TIDAK pernah dilewati middleware. Karena itu
 * setiap handler API yang memerlukan admin WAJIB memanggil requireAdmin()
 * atau requireRole() sebagai gerbang otorisasi pertama.
 *
 * Disengaja memakai discriminated-union supaya pemanggil diwajibkan
 * memeriksa `.ok` dan mengembalikan `.response` saat gagal — tidak ada jalan
 * untuk melupakan pengecekan otorisasi.
 */

export type GuardResult = { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }

const UNAUTHORIZED = NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
const FORBIDDEN = NextResponse.json(
  { success: false, message: 'Role kamu tidak memiliki izin untuk aksi ini' },
  { status: 403 }
)

/** Wajib login sebagai admin (role apa pun yang valid). */
export async function requireAdmin(): Promise<GuardResult> {
  const session = await getSession()
  if (!session) return { ok: false, response: UNAUTHORIZED }
  return { ok: true, session }
}

/**
 * Wajib login dengan salah satu role yang diizinkan. SUPERADMIN selalu lolos.
 * Gagal tanpa sesi -> 401; dengan sesi tapi role salah -> 403.
 */
export async function requireRole(...roles: AdminRoleType[]): Promise<GuardResult> {
  const session = await getSession()
  if (!session) return { ok: false, response: UNAUTHORIZED }
  if (session.role === 'SUPERADMIN' || roles.includes(session.role)) {
    return { ok: true, session }
  }
  return { ok: false, response: FORBIDDEN }
}