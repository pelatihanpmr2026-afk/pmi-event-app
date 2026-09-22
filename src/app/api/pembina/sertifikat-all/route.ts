import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSertifikatPembinaPdf } from '@/lib/generate-sertifikat-pembina'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'
import { PassThrough } from 'stream'

// eslint-disable-next-line @typescript-eslint/no-require-imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createArchive = require('archiver') as (...args: any[]) => any

export async function GET(req: NextRequest) {
  try {
    const guard = await requireRole('KESEKRETARIATAN', 'SUPERADMIN', 'KTA')
    if (!guard.ok) return guard.response

    const { searchParams } = new URL(req.url)
    const sekolahId = searchParams.get('sekolahId') || undefined
    const kategori = searchParams.get('kategori') || undefined

    const where = {
      ...(sekolahId ? { sekolahId } : {}),
      ...(kategori ? { sekolah: { kategori: kategori as 'WIRA' | 'MADYA' } } : {}),
    }

    const allPembina = await prisma.pembina.findMany({
      where,
      include: { sekolah: { select: { namaLengkap: true, kategori: true } } },
      orderBy: [{ sekolah: { namaLengkap: 'asc' } }, { nama: 'asc' }],
    })

    if (allPembina.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada data pembina' }, { status: 404 })
    }

    const passthrough = new PassThrough()
    const chunks: Buffer[] = []

    passthrough.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    const archive = createArchive('zip', { zlib: { level: 6 } })

    archive.pipe(passthrough)

    archive.on('error', (err: Error) => {
      console.error('[Archive error]', err)
      passthrough.destroy(err)
    })

    const generatePromises = allPembina.map(async (pembina) => {
      try {
        const buffer = await generateSertifikatPembinaPdf({
          namaPembina: pembina.nama,
          namaSekolah: pembina.sekolah.namaLengkap,
        })
        const safeName = pembina.sekolah.namaLengkap.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Sekolah'
        const filename = `Sertifikat_${safeName}_${pembina.nama.replace(/\s+/g, '_')}.pdf`
        archive.append(buffer, { name: filename })
      } catch (error) {
        console.error(`[SKIP] Gagal generate sertifikat untuk ${pembina.nama}:`, error)
      }
    })

    await Promise.all(generatePromises)

    await archive.finalize()

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'EXPORT_ALL_SERTIFIKAT_PEMBINA', {
      targetType: 'PESERTA',
      metadata: {
        jumlahPembina: allPembina.length,
        sekolahId: sekolahId ?? '-',
        kategori: kategori ?? '-',
      },
    })

    const filename = `Sertifikat_Pembina_${new Date().toISOString().slice(0, 10)}.zip`

    return new NextResponse(Buffer.concat(chunks), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/pembina/sertifikat-all]', error)
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal membuat file sertifikat' }, { status: 500 })
  }
}
