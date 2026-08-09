import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import { getUploadRootPath } from '@/lib/save-file'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[GET /uploads/...]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 })
  }
}