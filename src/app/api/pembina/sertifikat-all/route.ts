import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { generateSertifikatPembinaPdf } from '@/lib/generate-sertifikat-pembina'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'
import { PassThrough } from 'stream'
import sharp from 'sharp'

// eslint-disable-next-line @typescript-eslint/no-require-imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createArchive = require('archiver') as (...args: any[]) => any

export const dynamic = 'force-dynamic'

// Paralelisme generate PDF — tiap PDF ±60ms setelah template di-downscale &
// font di-subset, jadi 4 worker ringan untuk memori VPS.
const CONCURRENCY = 4

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
}

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

    // ===== 1) Siapkan aset sekali untuk semua PDF =====
    // Template 2482px → 1240px JPEG (≈140KB) cukup untuk sertifikat di layar/cetak biasa.
    const [templateFull, boldFontBytes] = await Promise.all([
      readFile(path.join(process.cwd(), 'public', 'assets', 'template_sertifkat.png')),
      readFile(path.join(process.cwd(), 'src', 'assets', 'fonts', 'Arial-Bold.ttf')),
    ])
    const templateImage = await sharp(templateFull)
      .flatten({ background: '#ffffff' })
      .resize({ width: 1240 })
      .jpeg({ quality: 82 })
      .toBuffer()
    const assets = { templateImage, templateIsJpg: true, boldFontBytes }

    const jobs = allPembina.map((pembina) => {
      const safeSekolah = safeFilename(pembina.sekolah.namaLengkap) || 'Sekolah'
      return {
        pembina,
        filename: `Sertifikat_${safeSekolah}_${pembina.nama.replace(/\s+/g, '_')}.pdf`,
      }
    })

    // ===== 2) Stream ZIP progresif (byte mengalir → proxy tidak 504) =====
    const passthrough = new PassThrough()
    const archive = createArchive('zip', { zlib: { level: 1 } })
    archive.on('warning', (err: Error) => console.warn('[Archive warning]', err.message))
    archive.on('error', (err: Error) => {
      console.error('[Archive error]', err)
      passthrough.destroy(err)
    })
    archive.pipe(passthrough)

    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        passthrough.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
        passthrough.on('end', () => controller.close())
        passthrough.on('error', (err) => controller.error(err))
      },
      cancel() {
        try {
          archive.abort()
        } catch {
          // abaikan — archive mungkin sudah selesai
        }
      },
    })

    // Jalan di background; response dikembalikan langsung agar koneksi hidup.
    void (async () => {
      try {
        let cursor = 0
        async function worker() {
          while (cursor < jobs.length) {
            const job = jobs[cursor++]
            try {
              const buffer = await generateSertifikatPembinaPdf({
                namaPembina: job.pembina.nama,
                namaSekolah: job.pembina.sekolah.namaLengkap,
                assets,
              })
              archive.append(buffer, { name: job.filename })
            } catch (error) {
              console.error(`[SKIP] Gagal generate sertifikat untuk ${job.pembina.nama}:`, error)
            }
          }
        }
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()))
        await archive.finalize()
        await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'EXPORT_ALL_SERTIFIKAT_PEMBINA', {
          targetType: 'PESERTA',
          metadata: {
            jumlahPembina: allPembina.length,
            sekolahId: sekolahId ?? '-',
            kategori: kategori ?? '-',
          },
        })
      } catch (error) {
        console.error('[GET /api/pembina/sertifikat-all] background error', error)
        passthrough.destroy(error instanceof Error ? error : new Error('Gagal membuat file sertifikat'))
      }
    })()

    const filename = `Sertifikat_Pembina_${new Date().toISOString().slice(0, 10)}.zip`
    return new NextResponse(webStream, {
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
