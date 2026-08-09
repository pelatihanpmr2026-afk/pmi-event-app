import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })
    }

    const sekolahList = await prisma.sekolah.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        peserta: { select: { tipe: true } },
        tendaSewa: { select: { jumlah: true } },
        pembayaran: true,
      },
    })

    const data = sekolahList.map((s) => {
      const pembayaranPeserta = s.pembayaran.find((p) => p.tipe === 'PESERTA') ?? null
      const pembayaranTenda = s.pembayaran.find((p) => p.tipe === 'TENDA') ?? null

      return {
        id: s.id,
        namaLengkap: s.namaLengkap,
        kodePendaftaran: s.kodePendaftaran,
        jenjang: s.jenjang,
        kategori: s.kategori,
        namaPembina: s.namaPembina,
        noWhatsappPembina: s.noWhatsappPembina,
        jumlahPeserta: s.peserta.filter((p) => p.tipe === 'PESERTA').length,
        jumlahPendamping: s.peserta.filter((p) => p.tipe === 'PENDAMPING').length,
        jumlahTenda: s.tendaSewa.reduce((sum, t) => sum + t.jumlah, 0),
        estimasiPesertaPendamping: s.estimasiPesertaPendamping,
        pembayaranPeserta: pembayaranPeserta
          ? {
              id: pembayaranPeserta.id,
              status: pembayaranPeserta.statusPembayaran,
              jumlahBiaya: pembayaranPeserta.jumlahBiaya,
            }
          : null,
        pembayaranTenda: pembayaranTenda
          ? {
              id: pembayaranTenda.id,
              status: pembayaranTenda.statusPembayaran,
              jumlahBiaya: pembayaranTenda.jumlahBiaya,
            }
          : null,
        createdAt: s.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/sekolah/list]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}