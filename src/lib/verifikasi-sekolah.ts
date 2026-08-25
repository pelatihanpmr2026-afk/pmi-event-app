import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeNoWa } from '@/lib/validations/susulan'
import {
  createPaymentSessionToken,
  PAYMENT_SESSION_COOKIE,
  PAYMENT_SESSION_MAX_AGE,
} from '@/lib/payment-session'
import {
  createTendaSessionToken,
  TENDA_SESSION_COOKIE,
  TENDA_SESSION_MAX_AGE,
} from '@/lib/tenda-session'
import { createSusulanSessionToken, SUSULAN_SESSION_COOKIE, SUSULAN_SESSION_MAX_AGE } from '@/lib/susulan-session'

type TujuanVerifikasi = 'pembayaran' | 'tenda' | 'susulan'

const genericError = { success: false, message: 'No. WhatsApp pembina tidak terdaftar di sistem' }

export interface SekolahVerifikasi {
  id: string
  namaLengkap: string
  kodePendaftaran: string
  namaPembina: string
  noWhatsappPembina: string
  kategori: string
  peserta: { tipe: string }[]
  pembayaran: { batchKe: number; statusPembayaran: string }[]
}

const selectSekolahVerifikasi = {
  id: true,
  namaLengkap: true,
  kodePendaftaran: true,
  namaPembina: true,
  noWhatsappPembina: true,
  kategori: true,
  peserta: { select: { tipe: true } },
  pembayaran: {
    where: { tipe: 'PESERTA' },
    orderBy: { batchKe: 'desc' },
    select: { batchKe: true, statusPembayaran: true },
  },
} as const

/**
 * Verifikasi kepemilikan sekolah hanya dengan No. WhatsApp pembina/pelatih
 * yang terdaftar. Satu nomor bisa terdaftar di beberapa sekolah (pembina
 * biasanya membina 2-3 sekolah), jadi fungsi ini mengembalikan SEMUA sekolah
 * yang cocok — terserah caller apakah menerbitkan sesi (kalau cuma 1) atau
 * menampilkan daftar untuk dipilih (kalau lebih dari 1).
 */
export async function cariSekolahByNoWa(noWa: string): Promise<SekolahVerifikasi[]> {
  const semua = await prisma.sekolah.findMany({ select: selectSekolahVerifikasi })
  const normalized = normalizeNoWa(noWa)
  return semua.filter((s) => normalizeNoWa(s.noWhatsappPembina) === normalized) as SekolahVerifikasi[]
}

/**
 * Cek satu sekolah (diketahui id-nya) dimiliki oleh noWa ini. Dipakai alur
 * pembayaran (id dari URL) dan tenda (id dari hasil pencarian).
 */
export async function cekSekolahByIdDanNoWa(sekolahId: string, noWa: string): Promise<SekolahVerifikasi | null> {
  const sekolah = await prisma.sekolah.findUnique({ where: { id: sekolahId }, select: selectSekolahVerifikasi })
  if (!sekolah) return null
  if (normalizeNoWa(sekolah.noWhatsappPembina) !== normalizeNoWa(noWa)) return null
  return sekolah as SekolahVerifikasi
}

export function errorNoWaTidakCocok() {
  return NextResponse.json(genericError, { status: 404 })
}

/** Set cookie sesi sesuai tujuan verifikasi. Response harus non-null. */
export async function terbitkanSesiSekolah(
  response: NextResponse,
  tujuan: TujuanVerifikasi,
  sekolahId: string
): Promise<void> {
  const config = {
    pembayaran: {
      token: () => createPaymentSessionToken(sekolahId),
      name: PAYMENT_SESSION_COOKIE,
      maxAge: PAYMENT_SESSION_MAX_AGE,
      path: `/api/sekolah/${sekolahId}`,
    },
    tenda: {
      token: () => createTendaSessionToken(sekolahId),
      name: TENDA_SESSION_COOKIE,
      maxAge: TENDA_SESSION_MAX_AGE,
      path: `/api/sekolah/${sekolahId}`,
    },
    susulan: {
      token: () => createSusulanSessionToken(sekolahId),
      name: SUSULAN_SESSION_COOKIE,
      maxAge: SUSULAN_SESSION_MAX_AGE,
      path: `/api/sekolah/${sekolahId}/susulan`,
    },
  }[tujuan]

  const token = await config.token()
  response.cookies.set(config.name, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: config.maxAge,
    path: config.path,
  })
}