import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from '@/lib/constants-sekolah'
import { generateExcelRekapPendaftaran } from '@/lib/generate-excel-rekap-pendaftaran'
import { generatePdfRekapPendaftaran } from '@/lib/generate-pdf-rekap-pendaftaran'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tanggalStr = searchParams.get('tanggal')
    const format = searchParams.get('format')
    if (!tanggalStr || !format) return NextResponse.json({ success: false, message: 'Parameter tidak lengkap' }, { status: 400 })

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

    const totals = {
      totalJumlahPeserta,
      totalJumlahPendamping,
      totalJumlahTenda,
      totalPendaftaran,
      totalSewaTenda,
      totalKeseluruhan: totalPendaftaran + totalSewaTenda,
    }

    const tanggalLabel = new Date(tanggalStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    if (format === 'excel') {
      const buffer = await generateExcelRekapPendaftaran(tanggalLabel, pendaftaran, tenda, totals)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Rekap_Pendaftaran_${tanggalStr}.xlsx"`,
        },
      })
    }

    const buffer = await generatePdfRekapPendaftaran(tanggalLabel, pendaftaran, tenda, totals)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rekap_Pendaftaran_${tanggalStr}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/pendaftaran/rekap-harian/download]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}