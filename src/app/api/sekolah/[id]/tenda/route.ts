import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tendaSelectionSchema } from '@/lib/validations/tenda'
import { TENDA_TOLERANSI } from '@/lib/constants-sekolah'
import { lockDanValidasiStokTenda } from '@/lib/tenda-stock'
import { hasTendaSession, TENDA_SESSION_COOKIE } from '@/lib/tenda-session'
import { deleteFileByUrl } from '@/lib/save-file'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'
import { generateKwitansi, type KwitansiLineItem } from '@/lib/generate-kwitansi'
import { generateQrCode } from '@/lib/generate-qrcode'
import { getAbsolutePathFromUrl } from '@/lib/save-file'
import { readFile } from 'fs/promises'
import { nanoid } from 'nanoid'
import { sanitizeFilename } from '@/lib/sekolah'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole('KESEKRETARIATAN')
  if (!guard.ok) return guard.response

  try {
    const { id } = await params
    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      select: {
        namaLengkap: true,
        kodePendaftaran: true,
        tendaSewa: { select: { id: true } },
        pembayaran: {
          where: { tipe: 'TENDA' },
          select: { buktiTransferUrl: true, kwitansiUrl: true },
        },
      },
    })

    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }
    if (sekolah.tendaSewa.length === 0) {
      return NextResponse.json({ success: false, message: 'Data sewa tenda tidak ditemukan' }, { status: 404 })
    }

    const files = sekolah.pembayaran
      .flatMap((pembayaran) => [pembayaran.buktiTransferUrl, pembayaran.kwitansiUrl])
      .filter((url): url is string => Boolean(url))

    await prisma.$transaction([
      prisma.tendaSewa.deleteMany({ where: { sekolahId: id } }),
      prisma.pembayaran.deleteMany({ where: { sekolahId: id, tipe: 'TENDA' } }),
    ])
    await Promise.all(files.map((url) => deleteFileByUrl(url)))

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'HAPUS_SEWA_TENDA', {
      targetType: 'SEWA_TENDA',
      targetId: id,
      metadata: { targetName: sekolah.namaLengkap, kodePendaftaran: sekolah.kodePendaftaran },
    })

    return NextResponse.json({ success: true, message: 'Sewa tenda berhasil dihapus' })
  } catch (error) {
    console.error('[DELETE /api/sekolah/:id/tenda]', error)
    return NextResponse.json({ success: false, message: 'Gagal menghapus sewa tenda' }, { status: 500 })
  }
}

/** Edit sewa tenda yang sudah diproses admin, termasuk nominal dan kwitansinya. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole('KESEKRETARIATAN')
  if (!guard.ok) return guard.response

  let kwitansiBaruUrl: string | null = null
  let qrCodeUrl: string | null = null

  try {
    const { id } = await params
    const parsed = tendaSelectionSchema.safeParse(await req.json())
    if (!parsed.success || parsed.data.pilihan.length === 0) {
      return NextResponse.json({ success: false, message: 'Pilih minimal satu jenis tenda' }, { status: 400 })
    }

    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      select: {
        id: true,
        namaLengkap: true,
        namaPembina: true,
        kodePendaftaran: true,
        estimasiPesertaPendamping: true,
        peserta: { select: { id: true } },
        tendaSewa: { select: { createdAt: true } },
        pembayaran: {
          where: { tipe: 'TENDA', batchKe: 1 },
          select: { id: true, jumlahBiaya: true, statusPembayaran: true, kwitansiUrl: true, qrToken: true, dibayarPada: true, createdAt: true },
        },
      },
    })
    if (!sekolah || sekolah.tendaSewa.length === 0) {
      return NextResponse.json({ success: false, message: 'Data sewa tenda tidak ditemukan' }, { status: 404 })
    }

    const pembayaran = sekolah.pembayaran[0]
    if (!pembayaran || !['LUNAS', 'MENUNGGU_KONFIRMASI'].includes(pembayaran.statusPembayaran)) {
      return NextResponse.json({ success: false, message: 'Hanya sewa tenda yang sudah dibayar atau sedang dikonfirmasi yang dapat diubah' }, { status: 409 })
    }

    const pilihan = parsed.data.pilihan
    const tendaJenis = await prisma.tendaJenis.findMany({ where: { id: { in: pilihan.map((item) => item.tendaJenisId) } } })
    if (tendaJenis.length !== pilihan.length) {
      return NextResponse.json({ success: false, message: 'Salah satu jenis tenda tidak ditemukan' }, { status: 400 })
    }

    const kapasitas = pilihan.reduce((total, item) => total + tendaJenis.find((tenda) => tenda.id === item.tendaJenisId)!.kapasitasMin * item.jumlah, 0)
    const batasKapasitas = Math.max(sekolah.peserta.length, sekolah.estimasiPesertaPendamping ?? 0) + TENDA_TOLERANSI
    if (kapasitas > batasKapasitas) {
      return NextResponse.json({ success: false, message: `Total kapasitas tenda (${kapasitas} orang) melebihi batas maksimal (${batasKapasitas} orang)` }, { status: 400 })
    }

    const totalBaru = pilihan.reduce((total, item) => total + tendaJenis.find((tenda) => tenda.id === item.tendaJenisId)!.harga * item.jumlah, 0)
    const qrToken = pembayaran.qrToken ?? nanoid(24)
    const referensi = sekolah.kodePendaftaran ?? `SEWA-TENDA-${sekolah.id}`
    const nomorKwitansi = `KW-${sanitizeFilename(referensi)}-TENDA`
    qrCodeUrl = await generateQrCode(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/kwitansi/verifikasi/${qrToken}`, `kwitansi-${nanoid(10)}.png`)
    const qrCodeBuffer = await readFile(getAbsolutePathFromUrl(qrCodeUrl))
    const items: KwitansiLineItem[] = pilihan.map((item) => {
      const jenis = tendaJenis.find((tenda) => tenda.id === item.tendaJenisId)!
      return { label: jenis.nama, qty: item.jumlah, hargaSatuan: jenis.harga, subtotal: jenis.harga * item.jumlah }
    })
    kwitansiBaruUrl = await generateKwitansi({
      nomorKwitansi,
      tipe: 'TENDA',
      namaSekolah: sekolah.namaLengkap,
      namaPembina: sekolah.namaPembina,
      kodePendaftaran: sekolah.kodePendaftaran,
      tanggalBayar: pembayaran.dibayarPada ?? pembayaran.createdAt,
      items,
      total: totalBaru,
      qrCodeBuffer,
      filename: `${sanitizeFilename(nomorKwitansi)}-${nanoid(8)}.pdf`,
    })

    const tanggalSewaAwal = sekolah.tendaSewa.reduce((awal, sewa) => sewa.createdAt < awal ? sewa.createdAt : awal, sekolah.tendaSewa[0].createdAt)
    await prisma.$transaction(async (tx) => {
      await lockDanValidasiStokTenda(tx, id, pilihan)
      const pembayaranTerbaru = await tx.pembayaran.findUnique({ where: { id: pembayaran.id } })
      if (!pembayaranTerbaru || !['LUNAS', 'MENUNGGU_KONFIRMASI'].includes(pembayaranTerbaru.statusPembayaran)) throw new Error('SEWA_TERKUNCI')

      await tx.tendaSewa.deleteMany({ where: { sekolahId: id } })
      await tx.tendaSewa.createMany({
        data: pilihan.map((item) => ({
          sekolahId: id,
          tendaJenisId: item.tendaJenisId,
          jumlah: item.jumlah,
          hargaSatuanSaatSewa: tendaJenis.find((tenda) => tenda.id === item.tendaJenisId)!.harga,
          createdAt: tanggalSewaAwal,
        })),
      })
      await tx.pembayaran.update({ where: { id: pembayaran.id }, data: { jumlahBiaya: totalBaru, qrToken, kwitansiUrl: kwitansiBaruUrl } })
    })

    if (pembayaran.kwitansiUrl && pembayaran.kwitansiUrl !== kwitansiBaruUrl) await deleteFileByUrl(pembayaran.kwitansiUrl)
    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'UBAH_SEWA_TENDA', {
      targetType: 'SEWA_TENDA',
      targetId: id,
      metadata: { namaSekolah: sekolah.namaLengkap, nominalLama: pembayaran.jumlahBiaya, nominalBaru: totalBaru, pilihan },
    })
    return NextResponse.json({ success: true, message: 'Sewa tenda dan kwitansi berhasil diperbarui', data: { totalBiaya: totalBaru, kwitansiUrl: kwitansiBaruUrl } })
  } catch (error) {
    await Promise.all([kwitansiBaruUrl, qrCodeUrl].filter((url): url is string => Boolean(url)).map((url) => deleteFileByUrl(url)))
    if (error instanceof Error && error.message.startsWith('STOK_HABIS:')) {
      const [, nama, sisa] = error.message.split(':')
      return NextResponse.json({ success: false, message: `Stok "${nama}" tersisa ${sisa} unit, tidak cukup.` }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'SEWA_TERKUNCI') {
      return NextResponse.json({ success: false, message: 'Status pembayaran berubah. Muat ulang data dan coba lagi.' }, { status: 409 })
    }
    console.error('[PUT /api/sekolah/:id/tenda]', error)
    return NextResponse.json({ success: false, message: 'Gagal memperbarui sewa tenda' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!(await hasTendaSession(req.cookies.get(TENDA_SESSION_COOKIE)?.value, id))) return NextResponse.json({ success: false, message: 'Verifikasi sekolah diperlukan untuk mengubah pilihan tenda' }, { status: 401 })
    const body = await req.json()
    const parsed = tendaSelectionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Data tidak valid' }, { status: 400 })
    }

    const { pilihan } = parsed.data

    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      include: {
        peserta: { select: { id: true } },
        pembayaran: { where: { tipe: 'TENDA' } },
      },
    })

    if (!sekolah) {
      return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })
    }

    const pembayaranTenda = sekolah.pembayaran[0] ?? null
    if (pembayaranTenda && pembayaranTenda.statusPembayaran !== 'BELUM_BAYAR') {
      return NextResponse.json(
        {
          success: false,
          message: 'Pilihan tenda untuk sekolah ini sudah masuk proses pembayaran dan tidak bisa diubah lagi',
        },
        { status: 409 }
      )
    }

    const jumlahAktual = sekolah.peserta.length
    const estimasi = sekolah.estimasiPesertaPendamping ?? 0
    const efektifJumlahOrang = Math.max(jumlahAktual, estimasi)
    const batasKapasitas = efektifJumlahOrang + TENDA_TOLERANSI

    if (pilihan.length === 0) {
      // Kosongkan seluruh pilihan tenda sekolah ini
      await prisma.$transaction([
        prisma.tendaSewa.deleteMany({ where: { sekolahId: id } }),
        prisma.pembayaran.deleteMany({ where: { sekolahId: id, tipe: 'TENDA' } }),
      ])

      return NextResponse.json({ success: true, data: { jumlahBiaya: 0 } })
    }

    const tendaIds = pilihan.map((p) => p.tendaJenisId)
    const tendaJenisList = await prisma.tendaJenis.findMany({ where: { id: { in: tendaIds } } })

    let totalKapasitas = 0
    let jumlahBiaya = 0

    for (const p of pilihan) {
      const jenis = tendaJenisList.find((t) => t.id === p.tendaJenisId)
      if (!jenis) {
        return NextResponse.json({ success: false, message: 'Jenis tenda tidak ditemukan' }, { status: 400 })
      }
      totalKapasitas += jenis.kapasitasMin * p.jumlah
      jumlahBiaya += jenis.harga * p.jumlah
    }

    if (totalKapasitas > batasKapasitas) {
      return NextResponse.json(
        {
          success: false,
          message: `Total kapasitas tenda (${totalKapasitas} orang) melebihi batas maksimal (${batasKapasitas} orang)`,
        },
        { status: 400 }
      )
    }
    try {
      const result = await prisma.$transaction(async (tx) => {
        await lockDanValidasiStokTenda(tx, id, pilihan)

        const pembayaranTerbaru = await tx.pembayaran.findUnique({
          where: { sekolahId_tipe_batchKe: { sekolahId: id, tipe: 'TENDA', batchKe: 1 } },
        })
        if (pembayaranTerbaru && pembayaranTerbaru.statusPembayaran !== 'BELUM_BAYAR') {
          throw new Error('PILIHAN_TERKUNCI')
        }

        await tx.tendaSewa.deleteMany({ where: { sekolahId: id } })
        await tx.tendaSewa.createMany({
          data: pilihan.map((p) => {
            const jenis = tendaJenisList.find((t) => t.id === p.tendaJenisId)!
            return {
              sekolahId: id,
              tendaJenisId: p.tendaJenisId,
              jumlah: p.jumlah,
              hargaSatuanSaatSewa: jenis.harga,
            }
          }),
        })

        await tx.pembayaran.upsert({
          where: { sekolahId_tipe_batchKe: { sekolahId: id, tipe: 'TENDA', batchKe: 1 } },
          create: { sekolahId: id, tipe: 'TENDA', batchKe: 1, jumlahBiaya, statusPembayaran: 'BELUM_BAYAR' },
          update: { jumlahBiaya },
        })

        return { jumlahBiaya }
      })

      return NextResponse.json({ success: true, data: result })
    } catch (txError) {
      if (txError instanceof Error && txError.message.startsWith('STOK_HABIS:')) {
        const [, nama, sisa] = txError.message.split(':')
        return NextResponse.json(
          { success: false, message: `Stok "${nama}" tersisa ${sisa} unit, tidak cukup.` },
          { status: 409 }
        )
      }
      if (txError instanceof Error && txError.message === 'PILIHAN_TERKUNCI') {
        return NextResponse.json(
          { success: false, message: 'Pembayaran tenda sudah diproses dan pilihan tidak dapat diubah.' },
          { status: 409 }
        )
      }
      throw txError
    }
  } catch (error) {
    console.error('[POST /api/sekolah/:id/tenda]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
