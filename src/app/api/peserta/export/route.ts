import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import { getAbsolutePathFromUrl } from '@/lib/save-file'
import { generateExcelPesertaRekapBuffer } from '@/lib/generate-excel-peserta-rekap'
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
    const withPhoto = searchParams.get('withPhoto') === 'true'

    const peserta = await prisma.peserta.findMany({
      where: { tipe, sekolahId, sekolah: kategori ? { kategori: kategori as 'WIRA' | 'MADYA' } : undefined },
      include: { sekolah: { select: { namaLengkap: true, kategori: true, nomorPendaftaran: true } } },
      orderBy: [{ sekolah: { nomorPendaftaran: 'asc' } }, { createdAt: 'asc' }],
    })

    const counterPerSekolah: Record<string, number> = {}

    const rows = await Promise.all(
      peserta.map(async (p) => {
        counterPerSekolah[p.sekolahId] = (counterPerSekolah[p.sekolahId] ?? 0) + 1
        const urutan = counterPerSekolah[p.sekolahId]

        let fotoBuffer: Buffer | null = null
        if (tipe === 'PESERTA' && withPhoto && p.fotoUrl) {
          try {
            fotoBuffer = await readFile(getAbsolutePathFromUrl(p.fotoUrl))
          } catch {
            fotoBuffer = null
          }
        }

        return {
          noPeserta: formatNoPeserta(p.sekolah.nomorPendaftaran, urutan),
          namaLengkap: p.namaLengkap,
          sekolahNama: p.sekolah.namaLengkap,
          tempatLahir: p.tempatLahir,
          tanggalLahir: p.tanggalLahir,
          alamat : p.alamat,
          agama: p.agama,
          golonganDarah: p.golonganDarah,
          tahunMasuk: p.tahunMasuk,
          noHp: p.noHp,
          gender: p.gender,
          riwayatPenyakit: p.riwayatPenyakit,
          fotoBuffer,
        }
      })
    )

    const buffer = await generateExcelPesertaRekapBuffer(rows, tipe, withPhoto)
    const label = tipe === 'PESERTA' ? 'Peserta' : 'Pendamping'
    const filename = `Data_${label}${withPhoto ? '_Foto' : ''}_${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/peserta/export]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}