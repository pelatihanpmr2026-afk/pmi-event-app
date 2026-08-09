import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from '@/lib/constants-sekolah'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tanggalStr = searchParams.get('tanggal')
    if (!tanggalStr) return NextResponse.json({ success: false, message: 'Tanggal wajib diisi' }, { status: 400 })

    const start = new Date(`${tanggalStr}T00:00:00`)
    const end = new Date(`${tanggalStr}T23:59:59`)

    const sekolahList = await prisma.sekolah.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        peserta: { select: { tipe: true } },
        tendaSewa: { include: { tendaJenis: { select: { nama: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const pendaftaran = sekolahList.map((s) => {
      const jumlahPeserta = s.peserta.filter((p) => p.tipe === 'PESERTA').length
      const jumlahPendamping = s.peserta.filter((p) => p.tipe === 'PENDAMPING').length
      const totalRp = jumlahPeserta * BIAYA_PESERTA + jumlahPendamping * BIAYA_PENDAMPING
      return { namaSekolah: s.namaLengkap, jumlahPeserta, jumlahPendamping, totalRp }
    })

    // Per sekolah + per jenis tenda (bukan diagregasi global)
    const tenda = sekolahList.flatMap((s) =>
      s.tendaSewa.map((t) => ({
        namaSekolah: s.namaLengkap,
        namaTenda: t.tendaJenis.nama,
        jumlahTenda: t.jumlah,
        totalRp: t.jumlah * t.hargaSatuanSaatSewa,
      }))
    )

    const totalJumlahPeserta = pendaftaran.reduce((s, r) => s + r.jumlahPeserta, 0)
    const totalJumlahPendamping = pendaftaran.reduce((s, r) => s + r.jumlahPendamping, 0)
    const totalPendaftaran = pendaftaran.reduce((s, r) => s + r.totalRp, 0)

    const totalJumlahTenda = tenda.reduce((s, r) => s + r.jumlahTenda, 0)
    const totalSewaTenda = tenda.reduce((s, r) => s + r.totalRp, 0)

    return NextResponse.json({
      success: true,
      data: {
        pendaftaran,
        tenda,
        totalJumlahPeserta,
        totalJumlahPendamping,
        totalJumlahTenda,
        totalPendaftaran,
        totalSewaTenda,
        totalKeseluruhan: totalPendaftaran + totalSewaTenda,
      },
    })
  } catch (error) {
    console.error('[GET /api/pendaftaran/rekap-harian]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}