import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { getUploadRootPath } from '@/lib/save-file'
import { validateFileContent, detectFileType } from '@/lib/file-type'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params

    // Cegah path traversal (mis. /uploads/../../../../windows/system32)
    if (pathSegments.some((segment) => segment.includes('..') || segment.includes('\\'))) {
      return NextResponse.json({ success: false, message: 'Path tidak valid' }, { status: 400 })
    }

    const uploadRoot = getUploadRootPath()
    const filePath = path.join(uploadRoot, ...pathSegments)

    // Pastikan hasil resolusi path tetap di dalam uploadRoot (lapisan keamanan tambahan)
    if (!filePath.startsWith(uploadRoot)) {
      return NextResponse.json({ success: false, message: 'Path tidak valid' }, { status: 400 })
    }

    const fileStat = await stat(filePath).catch(() => null)
    if (!fileStat || !fileStat.isFile()) {
      return NextResponse.json({ success: false, message: 'File tidak ditemukan' }, { status: 404 })
    }

    const buffer = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    let contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

    // Validasi isi ulang dengan magic bytes saat diserve — jangan percaya
    // begitu saja pada ekstensi. File yang isinya tidak cocok ditolak
    // KECUALI isinya gambar valid (png/jpeg/webp) — ekstensi salah tidak
    // berbahaya untuk gambar, browser tetap bisa menampilkannya.
    if (!validateFileContent(buffer, filePath)) {
      const detected = detectFileType(buffer)
      if (detected && detected in IMAGE_CONTENT_TYPES) {
        // Isi file adalah gambar valid tetapi ekstensinya berbeda —
        // tetap layani agar file lama tidak rusak.
        console.warn(`[GET /uploads/...] ekstensi "${ext}" tidak cocok dengan isi "${detected}" untuk ${filePath}`)
        contentType = IMAGE_CONTENT_TYPES[detected]
      } else {
        return NextResponse.json({ success: false, message: 'File tidak valid' }, { status: 400 })
      }
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; sandbox",
      },
    })
  } catch (error) {
    console.error('[GET /uploads/...]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 })
  }
}