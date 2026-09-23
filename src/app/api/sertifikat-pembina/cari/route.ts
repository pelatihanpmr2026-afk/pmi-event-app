import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { namaSekolahKey } from '@/lib/sekolah'

// Kata pengisi yang diabaikan saat pencocokan (varian penulisan status negeri/swasta)
const TOKEN_ABAIKAN = new Set(['NEGERI', 'N', 'SWASTA', 'NEG', 'SWT'])

function tokenKunci(nama: string): string[] {
  return namaSekolahKey(nama)
    .replace(/[^A-Z0-9\s]/gi, ' ')
    .toUpperCase()
    .split(/\s+/)
    .filter((t) => t && !TOKEN_ABAIKAN.has(t))
}

/**
 * Totok cocok jika SETIAP token query muncul utuh sebagai token nama sekolah.
 * "smpn 1 cianjur" → [SMP,1,CIANJUR] cocok dengan "SMP NEGERI 1 CIANJUR",
 * "SMP N 1 CIANJUR", maupun "SMPN 1 CIANJUR" karena namaSekolahKey
 * menyetarakan SMPN/SMP N/SMP NEGERI menjadi SMP.
 * Perbandingan per-token penuh (bukan substring) agar "1" tidak cocok dengan "10".
 */
function cocokSekolah(query: string, namaDb: string): boolean {
  const tokenQuery = tokenKunci(query)
  if (tokenQuery.length === 0) return false
  const tokenDb = new Set(tokenKunci(namaDb))
  return tokenQuery.every((t) => tokenDb.has(t))
}

/**
 * GET /api/sertifikat-pembina/cari?q=...
 *
 * Publik (tanpa login) — autocomplete DAFTAR SEKOLAH saja. Nama pembina
 * TIDAK PERNAH dikembalikan di endpoint ini agar tidak bisa di-enumerasi;
 * nama pembina baru terlihat setelah user memilih sekolahnya
 * (lihat GET /api/sertifikat-pembina/sekolah/[sekolahId]/pembina).
 * Di-rate-limit agar tidak bisa di-scrape massal.
 */
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { key: 'sertifikat-cari', max: 30, windowMs: 15 * 60 * 1000 })
    if (rl) return rl

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const nama = (searchParams.get('nama') ?? '').trim()
    const sekolah = (searchParams.get('sekolah') ?? '').trim()

    // Mode autocomplete satu kolom: kembalikan DAFTAR SEKOLAH yang cocok
    // (tanpa nama pembina) — cocokkan nama sekolah ATAU nama pembina,
    // tapi yang diekspos hanya sekolahnya.
    if (q) {
      if (q.length < 2) {
        return NextResponse.json(
          { success: false, message: 'Masukkan minimal 2 karakter' },
          { status: 400 }
        )
      }
      const qLower = q.toLowerCase()
      // Muat semua sekolah lalu cocokkan di memori: pencocokan SQL `contains`
      // tidak mengenal varian penulisan (SMPN vs SMP NEGERI), sedangkan
      // pencocokan token atas namaSekolahKey mengenalinya.
      const semua = await prisma.sekolah.findMany({
        select: {
          id: true,
          namaLengkap: true,
          kategori: true,
          pembina: { select: { nama: true } },
          _count: { select: { pembina: true } },
        },
        orderBy: { namaLengkap: 'asc' },
      })
      const sekolahList = semua
        .filter(
          (s) =>
            cocokSekolah(q, s.namaLengkap) ||
            s.namaLengkap.toLowerCase().includes(qLower) ||
            s.pembina.some((p) => p.nama.toLowerCase().includes(qLower))
        )
        .slice(0, 10)
      return NextResponse.json({
        success: true,
        data: sekolahList.map((s) => ({
          id: s.id,
          namaSekolah: s.namaLengkap,
          kategori: s.kategori,
          jumlahPembina: s._count.pembina,
        })),
      })
    }

    if (nama.length < 3 && sekolah.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Masukkan minimal 3 karakter nama pembina atau nama sekolah' },
        { status: 400 }
      )
    }

    const hasil = await prisma.pembina.findMany({
      where: {
        ...(nama ? { nama: { contains: nama } } : {}),
        ...(sekolah ? { sekolah: { namaLengkap: { contains: sekolah } } } : {}),
      },
      include: { sekolah: { select: { namaLengkap: true, kategori: true } } },
      orderBy: [{ sekolah: { namaLengkap: 'asc' } }, { nama: 'asc' }],
      take: 20,
    })

    return NextResponse.json({
      success: true,
      data: hasil.map((p) => ({
        id: p.id,
        namaPembina: p.nama,
        namaSekolah: p.sekolah.namaLengkap,
        kategori: p.sekolah.kategori,
      })),
    })
  } catch (error) {
    console.error('[GET /api/sertifikat-pembina/cari]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
