import { PDFDocument } from 'pdf-lib'
import type { Canvas } from '@napi-rs/canvas'

export const A4_W = 595.28
export const A4_H = 841.89

/**
 * Embed gambar canvas ke halaman A4. Gambar diskalakan proporsional agar
 * SELALU muat dalam 1 halaman A4 (portrait). Jika tinggi konten melebihi A4,
 * gambar diperkecil — tetap satu halaman.
 */
export async function canvasToA4Pdf(canvas: Canvas, title: string): Promise<Buffer> {
  const pngBuffer = canvas.toBuffer('image/png')
  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(title)
  const img = await pdfDoc.embedPng(pngBuffer)
  const page = pdfDoc.addPage([A4_W, A4_H])

  const scale = Math.min(A4_W / canvas.width, A4_H / canvas.height)
  const w = canvas.width * scale
  const h = canvas.height * scale
  page.drawImage(img, { x: (A4_W - w) / 2, y: (A4_H - h) / 2, width: w, height: h })

  const bytes = await pdfDoc.save()
  return Buffer.from(bytes)
}