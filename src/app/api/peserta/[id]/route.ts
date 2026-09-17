import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'
import { saveBuffer, deleteFileByUrl } from '@/lib/save-file'
import { normalizeParticipantPhotoBuffer } from '@/lib/normalize-image-buffer'
import { logAdminAction } from '@/lib/admin-log'
import { ACCEPTED_FOTO_TYPES, MAX_FOTO_SIZE } from '@/lib/constants'
import { editPesertaSchema } from '@/lib/validations/peserta'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole('KESEKRETARIATAN')
  if (!guard.ok) return guard.response

  try {
    const { id } = await params

    const peserta = await prisma.peserta.findUnique({
      where: { id },
      select: {
        id: true,
        namaLengkap: true,
        fotoUrl: true,
        sekolah: { select: { namaLengkap: true } },
      },
    })

    if (!peserta) {
      return NextResponse.json({ success: false, message: 'Data peserta tidak ditemukan' }, { status: 404 })
    }

    const formData = await _req.formData()
    const removeFoto = formData.get('removeFoto') === '1'
    const foto = formData.get('foto') as File | null
    const hasFoto = foto instanceof File && foto.size > 0

    if (!removeFoto && !hasFoto) {
      return NextResponse.json(
        { success: false, message: 'Pilih foto pengganti atau hapus foto yang ada' },
        { status: 400 }
      )
    }

    const oldUrl = peserta.fotoUrl

    // ===== Hapus foto =====
    if (removeFoto) {
      await prisma.peserta.update({ where: { id }, data: { fotoUrl: null } })
      if (oldUrl) await deleteFileByUrl(oldUrl)

      await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'HAPUS_FOTO_PESERTA', {
        targetType: 'PESERTA',
        targetId: id,
        metadata: { namaLengkap: peserta.namaLengkap, sekolah: peserta.sekolah.namaLengkap },
      })

      return NextResponse.json({ success: true, message: 'Foto peserta berhasil dihapus' })
    }

    // ===== Ganti foto =====
    const file = foto as File
    if (file.size > MAX_FOTO_SIZE) {
      return NextResponse.json({ success: false, message: 'Ukuran foto maksimal 5MB' }, { status: 400 })
    }
    if (!ACCEPTED_FOTO_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, message: 'Format foto harus JPG atau PNG' }, { status: 400 })
    }

    let buffer: Buffer
    try {
      buffer = await normalizeParticipantPhotoBuffer(Buffer.from(await file.arrayBuffer()))
    } catch {
      return NextResponse.json(
        { success: false, message: 'Foto tidak valid. Gunakan JPG atau PNG yang tidak rusak.' },
        { status: 400 }
      )
    }

    const uid = nanoid(10)
    const newUrl = await saveBuffer(buffer, 'peserta-photos', `${uid}.jpg`)

    try {
      await prisma.peserta.update({ where: { id }, data: { fotoUrl: newUrl } })
    } catch (error) {
      // Jangan tinggalkan file baru yang sudah tersimpan kalau DB gagal update.
      await deleteFileByUrl(newUrl)
      throw error
    }

    // Best-effort: buang foto lama setelah update sukses.
    if (oldUrl) await deleteFileByUrl(oldUrl)

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'UBAH_FOTO_PESERTA', {
      targetType: 'PESERTA',
      targetId: id,
      metadata: { namaLengkap: peserta.namaLengkap, sekolah: peserta.sekolah.namaLengkap },
    })

    return NextResponse.json({ success: true, message: 'Foto peserta berhasil diganti', data: { fotoUrl: newUrl } })
  } catch (error) {
    console.error('[PATCH /api/peserta/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal mengganti foto peserta' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole('KESEKRETARIATAN')
  if (!guard.ok) return guard.response

  try {
    const { id } = await params
    const body = await req.json()

    const parsed = editPesertaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const peserta = await prisma.peserta.findUnique({
      where: { id },
      select: {
        id: true,
        namaLengkap: true,
        sekolah: { select: { namaLengkap: true } },
      },
    })

    if (!peserta) {
      return NextResponse.json({ success: false, message: 'Data peserta tidak ditemukan' }, { status: 404 })
    }

    const data = parsed.data
    const updated = await prisma.peserta.update({
      where: { id },
      data: {
        namaLengkap: data.namaLengkap.trim().replace(/\s+/g, ' ').toLocaleUpperCase('id-ID'),
        tempatLahir: data.tempatLahir.trim(),
        tanggalLahir: new Date(`${data.tanggalLahir}T00:00:00.000Z`),
        alamat: data.alamat.trim(),
        agama: data.agama,
        golonganDarah: data.golonganDarah,
        tahunMasuk: Number(data.tahunMasuk),
        noHp: data.noHp?.trim() || null,
        gender: data.gender,
        ...(data.riwayatPenyakit !== undefined && { riwayatPenyakit: data.riwayatPenyakit }),
      },
      select: {
        id: true,
        namaLengkap: true,
        tempatLahir: true,
        tanggalLahir: true,
        alamat: true,
        agama: true,
        golonganDarah: true,
        tahunMasuk: true,
        noHp: true,
        gender: true,
        riwayatPenyakit: true,
      },
    })

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'UBAH_DATA_PESERTA', {
      targetType: 'PESERTA',
      targetId: id,
      metadata: {
        namaLengkapSebelumnya: peserta.namaLengkap,
        namaLengkapBaru: updated.namaLengkap,
        sekolah: peserta.sekolah.namaLengkap,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Data peserta berhasil diperbarui',
      data: {
        ...updated,
        tanggalLahir: updated.tanggalLahir.toISOString(),
      },
    })
  } catch (error) {
    console.error('[PUT /api/peserta/:id]', error)
    return NextResponse.json({ success: false, message: 'Gagal memperbarui data peserta' }, { status: 500 })
  }
}