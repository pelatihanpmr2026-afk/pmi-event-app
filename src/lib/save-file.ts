import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

// Sengaja DI LUAR folder public/ — supaya tidak bergantung ke static file
// serving Next.js/Turbopack yang tidak reliable untuk file yang dibuat saat runtime.
const UPLOAD_ROOT = path.join(process.cwd(), 'storage', 'uploads')

export async function saveUploadedFile(
  file: File,
  subfolder: 'photos' | 'idcards' | 'qrcodes',
  filename: string
): Promise<string> {
  const targetDir = path.join(UPLOAD_ROOT, subfolder)
  await mkdir(targetDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  const targetPath = path.join(targetDir, filename)
  await writeFile(targetPath, buffer)

  return `/uploads/${subfolder}/${filename}`
}

export async function saveBuffer(
  buffer: Buffer,
  subfolder: 'photos' | 'idcards' | 'qrcodes',
  filename: string
): Promise<string> {
  const targetDir = path.join(UPLOAD_ROOT, subfolder)
  await mkdir(targetDir, { recursive: true })

  const targetPath = path.join(targetDir, filename)
  await writeFile(targetPath, buffer)

  return `/uploads/${subfolder}/${filename}`
}

export function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  return ext || '.jpg'
}

export function getUploadRootPath(): string {
  return UPLOAD_ROOT
}

export function getAbsolutePathFromUrl(url: string): string {
  // url format: /uploads/<subfolder>/<filename>
  const relative = url.replace(/^\/uploads\//, '')
  return path.join(getUploadRootPath(), relative)
}