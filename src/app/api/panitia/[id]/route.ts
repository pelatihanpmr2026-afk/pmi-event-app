import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { panitiaServerSchema } from '@/lib/validations/panitia'
import { saveUploadedFile, getFileExtension, getAbsolutePathFromUrl } from '@/lib/save-file'
import { generateIdCard } from '@/lib/generate-idcard'
import { DIVISI_OPTIONS, MAX_FOTO_SIZE, ACCEPTED_FOTO_TYPES } from '@/lib/constants'
import { getDivisiKuota } from '@/lib/divisi-kuota'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const { id } = await params

    // FIX: Ambil panitia dulu sebelum dihapus
    const panitia = await prisma.panitia.findUnique({
      where: { id },
    })
    if (!panitia) {
      return NextResponse.json(
        { success: false, message: 'Data panitia tidak ditemukan' },
        { status: 404 }
      )
    }

    await prisma.panitia.delete({ where: { id } })

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'HAPUS_PANITIA',
      {
        targetType: 'PANITIA',
        targetId: id,
        metadata: {
          targetName: panitia.nama,
          nomorRegistrasi: panitia.nomorRegistrasi,
        },
      }
    )

    return NextResponse.json({ success: true, message: 'Data panitia berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/panitia/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KESEKRETARIATAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const { id } = await params

    const panitia = await prisma.panitia.findUnique({ where: { id } })
    if (!panitia) {
      return NextResponse.json(
        { success: false, message: 'Data panitia tidak ditemukan' },
        { status: 404 }
      )
    }
    if (!panitia.qrCodeUrl) {
      return NextResponse.json(
        { success: false, message: 'QR Code panitia tidak ditemukan, ID Card tidak bisa dibuat ulang' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const rawData = {
      nama: formData.get('nama')?.toString() ?? '',
      gender: formData.get('gender')?.toString() ?? '',
      noWhatsapp: formData.get('noWhatsapp')?.toString() ?? '',
      alamat: formData.get('alamat')?.toString() ?? '',
      asalUnit: formData.get('asalUnit')?.toString() ?? '',
      divisi: formData.get('divisi')?.toString() ?? '',
    }

    const parsed = panitiaServerSchema.safeParse(rawData)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const data = parsed.data

    const foto = formData.get('foto')
    const gantiFoto = foto instanceof File && foto.size > 0
    if (gantiFoto) {
      if (foto.size > MAX_FOTO_SIZE) {
        return NextResponse.json(
          { success: false, message: 'Ukuran foto maksimal 5MB' },
          { status: 400 }
        )
      }
      if (!ACCEPTED_FOTO_TYPES.includes(foto.type)) {
        return NextResponse.json(
          { success: false, message: 'Format foto harus JPG atau PNG' },
          { status: 400 }
        )
      }
    }

    // Validasi kapasitas jika divisi diganti (di luar dirinya sendiri).
    if (data.divisi !== panitia.divisi) {
      const kuota = await getDivisiKuota()
      const maxKapasitas = kuota[data.divisi]
      const jumlahTerdaftar = await prisma.panitia.count({
        where: { divisi: data.divisi, id: { not: id } },
      })
      if (maxKapasitas !== undefined && jumlahTerdaftar >= maxKapasitas) {
        const divisiLabel = DIVISI_OPTIONS.find((d) => d.value === data.divisi)?.label ?? data.divisi
        return NextResponse.json(
          {
            success: false,
            message: `Kuota untuk divisi "${divisiLabel}" sudah penuh (maksimal ${maxKapasitas} orang). Silakan pilih divisi lain.`,
          },
          { status: 409 }
        )
      }
    }

    // Simpan foto baru jika diganti, lalu generate ulang ID Card
    // (nama/divisi/foto baru + QR Code lama yang tidak berubah).
    let fotoUrl = panitia.fotoUrl
    let fotoAbsolutePath = getAbsolutePathFromUrl(panitia.fotoUrl)
    if (gantiFoto && foto instanceof File) {
      const fotoFilename = `${nanoid(12)}${getFileExtension(foto.name)}`
      fotoUrl = await saveUploadedFile(foto, 'photos', fotoFilename)
      fotoAbsolutePath = getAbsolutePathFromUrl(fotoUrl)
    }

    const qrCodeAbsolutePath = getAbsolutePathFromUrl(panitia.qrCodeUrl)
    const divisiLabel = DIVISI_OPTIONS.find((d) => d.value === data.divisi)?.label ?? data.divisi
    const idCardUrl = await generateIdCard({
      fotoPath: fotoAbsolutePath,
      qrCodePath: qrCodeAbsolutePath,
      nama: data.nama,
      divisiLabel,
      filename: `${nanoid(12)}.png`,
    })

    const updated = await prisma.panitia.update({
      where: { id },
      data: {
        nama: data.nama,
        gender: data.gender,
        noWhatsapp: data.noWhatsapp,
        alamat: data.alamat,
        asalUnit: data.asalUnit,
        divisi: data.divisi,
        fotoUrl,
        idCardUrl,
      },
    })

    await logAdminAction(
      session.adminId,
      session.nama,
      session.role,
      'EDIT_PANITIA',
      {
        targetType: 'PANITIA',
        targetId: id,
        metadata: {
          targetName: updated.nama,
          nomorRegistrasi: updated.nomorRegistrasi,
          gantiFoto,
          idCardBaru: idCardUrl,
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Data panitia berhasil diperbarui dan ID Card dibuat ulang',
      data: {
        id: updated.id,
        nomorRegistrasi: updated.nomorRegistrasi,
        nama: updated.nama,
        gender: updated.gender,
        noWhatsapp: updated.noWhatsapp,
        alamat: updated.alamat,
        asalUnit: updated.asalUnit,
        divisi: updated.divisi,
        fotoUrl: updated.fotoUrl,
        qrCodeUrl: updated.qrCodeUrl,
        idCardUrl: updated.idCardUrl,
        status: updated.status,
        perdiem: updated.perdiem,
      },
    })
  } catch (error) {
    console.error('[PUT /api/panitia/:id]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}