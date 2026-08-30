import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { tendaJenisApiSchema } from '@/lib/validations/tenda-jenis'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'
import { deleteFileByUrl, saveUploadedFile } from '@/lib/save-file'

const MAX_TENDA_IMAGE_SIZE = 5 * 1024 * 1024

async function parseTendaRequest(req: NextRequest): Promise<{ data: unknown; gambar: File | null }> {
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    return {
      data: {
        nama: form.get('nama')?.toString() ?? '',
        namaVendor: form.get('namaVendor')?.toString() ?? '',
        kapasitasMin: Number(form.get('kapasitasMin')),
        kapasitasMax: Number(form.get('kapasitasMax')),
        harga: Number(form.get('harga')),
        hargaVendor: Number(form.get('hargaVendor')),
        stokTotal: Number(form.get('stokTotal')),
      },
      gambar: form.get('gambar') instanceof File ? form.get('gambar') as File : null,
    }
  }
  return { data: await req.json(), gambar: null }
}

async function saveTendaImage(file: File | null): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined
  if (file.size > MAX_TENDA_IMAGE_SIZE || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Gambar tenda harus JPG, PNG, atau WebP dan maksimal 5 MB')
  }
  const extension = file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg'
  return saveUploadedFile(file, 'tenda', `tenda-${nanoid(16)}${extension}`)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const { id } = await params
    const existing = await prisma.tendaJenis.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, message: 'Tenda tidak ditemukan' }, { status: 404 })

    const { data: body, gambar } = await parseTendaRequest(req)
    const parsed = tendaJenisApiSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const gambarUrl = await saveTendaImage(gambar)
    const tenda = await prisma.tendaJenis.update({
      where: { id },
      data: { ...parsed.data, ...(gambarUrl ? { gambarUrl } : {}) },
    })

    if (gambarUrl && existing.gambarUrl) await deleteFileByUrl(existing.gambarUrl)

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'EDIT_JENIS_TENDA',
      {
        targetType: 'TENDA',
        targetId: id,
        metadata: {
          targetName: tenda.nama,
          harga: tenda.harga,
          stokTotal: tenda.stokTotal,
        },
      }
    )

    return NextResponse.json({ success: true, data: tenda })
  } catch (error) {
    console.error('[PATCH /api/tenda/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const { id } = await params

    // FIX: Ambil tenda dulu sebelum dihapus
    const tenda = await prisma.tendaJenis.findUnique({
      where: { id },
    })
    if (!tenda) {
      return NextResponse.json({ success: false, message: 'Tenda tidak ditemukan' }, { status: 404 })
    }

    const jumlahTerpakai = await prisma.tendaSewa.count({ where: { tendaJenisId: id } })
    if (jumlahTerpakai > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak bisa dihapus — jenis tenda ini sudah pernah/sedang disewa oleh sekolah.`,
        },
        { status: 409 }
      )
    }

    await prisma.tendaJenis.delete({ where: { id } })
    if (tenda.gambarUrl) await deleteFileByUrl(tenda.gambarUrl)

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'HAPUS_JENIS_TENDA',
      {
        targetType: 'TENDA',
        targetId: id,
        metadata: { targetName: tenda.nama },
      }
    )

    return NextResponse.json({ success: true, message: 'Jenis tenda berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/tenda/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
