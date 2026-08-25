/**
 * Rate limiter in-memory sederhana (fixed window) untuk endpoint login.
 *
 * CATATAN: state tersimpan di memori proses — cukup untuk instance tunggal
 * (mis. PM2 `cluster` mode akan berbagi terbatas antar worker). Untuk skala
 * multi-instance, ganti dengan penyimpanan bersama (Redis / DB / memcached).
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 15 * 60 * 1000 // 15 menit
const MAX_ATTEMPTS = 10 // percobaan gagal maksimal per jendela

function cleanup(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/** Cek apakah key masih punya kuota percobaan. */
export function isRateLimited(key: string, now = Date.now()): boolean {
  cleanup(now)
  const bucket = buckets.get(key)
  if (!bucket) return false
  return bucket.count >= MAX_ATTEMPTS
}

/** Catat satu percobaan (panggil saat login GAGAL). */
export function recordFailedAttempt(key: string, now = Date.now()): number {
  cleanup(now)
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return 1
  }
  existing.count += 1
  return existing.count
}

/** Bersihkan kuota saat login berhasil supaya akun tidak terkunci sia-sia. */
export function resetAttempts(key: string) {
  buckets.delete(key)
}

/** Ambil IP klien dengan aman dari header proxy (fallback ke 'unknown'). */
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Throttle umum berbasis IP untuk endpoint publik yang memakai `req`.
 * Mengembalikan respons 429 jika kuota terlampaui, atau `null` jika boleh lanjut.
 */
export function checkRateLimit(
  req: NextRequest,
  opts: { key?: string; max: number; windowMs: number }
): NextResponse | null {
  const now = Date.now()
  cleanup(now)
  const key = `${opts.key ?? 'rl'}:${clientIp(req)}`
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return null
  }
  bucket.count += 1
  if (bucket.count > opts.max) {
    return NextResponse.json(
      { success: false, message: 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.' },
      { status: 429 }
    )
  }
  return null
}