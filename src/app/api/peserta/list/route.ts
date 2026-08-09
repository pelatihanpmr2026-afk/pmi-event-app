import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { formatNoPeserta } from '@/lib/peserta-numbering'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, message: 'Tidak diizinkan' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tipe = (searchParams.get('tipe') === 'PENDAMPING' ? 'PENDAMPING' : 'PESERTA') as
      | 'PESERTA'
      | 'PENDAMPING'
    const sekolahId = searchParams.get('sekolahId') || undefined
    const kategori = searchParams.get('kategori') || undefined

    const peserta = await prisma.peserta.findMany({
      where: {
        tipe,
        sekolahId,
        sekolah: kategori ? { kategori: kategori as 'WIRA' | 'MADYA' } : undefined,
      },
      include: {
        sekolah: { select: { namaLengkap: true, kategori: true, nomorPendaftaran: true } },
      },
      orderBy: [{ sekolah: { nomorPendaftaran: 'asc' } }, { createdAt: 'asc' }],
    })

    // Hitung urutan per sekolah untuk format No Peserta (XX-XXX)
    const counterPerSekolah: Record<string, number> = {}

    const data = peserta.map((p) => {
      counterPerSekolah[p.sekolahId] = (counterPerSekolah[p.sekolahId] ?? 0) + 1
      const urutan = counterPerSekolah[p.sekolahId]

      return {
        id: p.id,
        noPeserta: formatNoPeserta(p.sekolah.nomorPendaftaran, urutan),
        namaLengkap: p.namaLengkap,
        sekolahNama: p.sekolah.namaLengkap,
        kategori: p.sekolah.kategori,
        tempatLahir: p.tempatLahir,
        tanggalLahir: p.tanggalLahir.toISOString(),
        alamat: p.alamat,
        agama: p.agama,
        golonganDarah: p.golonganDarah,
        tahunMasuk: p.tahunMasuk,
        noHp: p.noHp,
        gender: p.gender,
        riwayatPenyakit: p.riwayatPenyakit,
        fotoUrl: p.fotoUrl,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/peserta/list]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}