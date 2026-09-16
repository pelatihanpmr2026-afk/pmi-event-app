import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'
import { generateKodePendaftaran, sanitizeFilename } from '@/lib/sekolah'
import { generateKwitansi, type KwitansiLineItem } from '@/lib/generate-kwitansi'
import { generateQrCode } from '@/lib/generate-qrcode'
import { getBaseUrl } from '@/lib/get-base-url'
import { getAbsolutePathFromUrl } from '@/lib/save-file'
import { deleteFileByUrl } from '@/lib/save-file'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from '@/lib/constants-sekolah'
import { Prisma, type KategoriSekolah } from '@prisma/client'
import { nanoid } from 'nanoid'

const FIXED_MIDDLE = '02.03.15.AR'
const FIXED_YEAR = '2026'

function kategoriCode(kategori: KategoriSekolah): 'MD' | 'WR' {
  return kategori === 'MADYA' ? 'MD' : 'WR'
}

function formatNoPeserta(nomorPendaftaran: number, kategori: KategoriSekolah, urutPeserta: number): string {
  const nomorSekolah = String(nomorPendaftaran).padStart(3, '0')
  const nomorUrutPeserta = String(urutPeserta).padStart(2, '0')
  return `${nomorSekolah}.${FIXED_MIDDLE}.${kategoriCode(kategori)}.${nomorUrutPeserta}.${FIXED_YEAR}`
}

async function findNextUrutPeserta(tx: Prisma.TransactionClient, kategori: KategoriSekolah): Promise<number> {
  const pesertaBernomor = await tx.peserta.findMany({
    where: { tipe: 'PESERTA', noPeserta: { not: null }, sekolah: { kategori } },
    select: { noPeserta: true },
  })

  let max = 0
  for (const peserta of pesertaBernomor) {
    if (!peserta.noPeserta) continue
    const bagian = peserta.noPeserta.split('.')
    if (bagian.length !== 8 || bagian.at(-1) !== FIXED_YEAR || bagian[5] !== kategoriCode(kategori)) continue
    const urut = Number.parseInt(bagian.at(-2) ?? '', 10)
    if (Number.isInteger(urut) && urut > max) max = urut
  }

  return max + 1
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole('SUPERADMIN', 'KESEKRETARIATAN')
  if (!guard.ok) return guard.response

  try {
    const { id } = await params
    const body = await req.json()
    const newKategori = body?.kategori as string

    if (newKategori !== 'WIRA' && newKategori !== 'MADYA') {
      return NextResponse.json(
        { success: false, message: 'Kategori tidak valid. Pilih WIRA atau MADYA.' },
        { status: 400 }
      )
    }

    const sekolah = await prisma.sekolah.findUnique({
      where: { id },
      select: {
        id: true,
        namaLengkap: true,
        namaPembina: true,
        kategori: true,
        nomorPendaftaran: true,
        kodePendaftaran: true,
        tahunPendaftaran: true,
        peserta: {
          select: { id: true, noPeserta: true, tipe: true },
          orderBy: { createdAt: 'asc' },
        },
        pembayaran: {
          select: {
            id: true,
            tipe: true,
            batchKe: true,
            jumlahBiaya: true,
            statusPembayaran: true,
            kwitansiUrl: true,
            qrToken: true,
            dibayarPada: true,
            createdAt: true,
          },
        },
      },
    })

    if (!sekolah) {
      return NextResponse.json(
        { success: false, message: 'Sekolah tidak ditemukan' },
        { status: 404 }
      )
    }

    if (sekolah.kategori === newKategori) {
      return NextResponse.json(
        { success: false, message: 'Kategori sudah sesuai, tidak ada perubahan' },
        { status: 400 }
      )
    }

    // 1) Generate kode pendaftaran baru untuk kategori target
    const kodeInfo = await generateKodePendaftaran(sekolah.namaLengkap, newKategori as KategoriSekolah, sekolah.tahunPendaftaran ?? undefined)

    // 2) Transaksi: update kategori + kode + reset & reassign noPeserta
    await prisma.$transaction(async (tx) => {
      // Update kategori & kode pendaftaran
      await tx.sekolah.update({
        where: { id },
        data: {
          kategori: newKategori as KategoriSekolah,
          nomorPendaftaran: kodeInfo.nomorPendaftaran,
          kodePendaftaran: kodeInfo.kodePendaftaran,
        },
      })

      // Reset semua noPeserta peserta sekolah ini
      await tx.peserta.updateMany({
        where: { sekolahId: id, tipe: 'PESERTA' },
        data: { noPeserta: null },
      })

      // Reassign noPeserta dengan kategori baru
      const pesertaTanpaNomor = await tx.peserta.findMany({
        where: { sekolahId: id, tipe: 'PESERTA', noPeserta: null },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })

      let urut = await findNextUrutPeserta(tx, newKategori as KategoriSekolah)
      for (const peserta of pesertaTanpaNomor) {
        const noPeserta = formatNoPeserta(kodeInfo.nomorPendaftaran, newKategori as KategoriSekolah, urut)
        await tx.peserta.update({
          where: { id: peserta.id },
          data: { noPeserta },
        })
        urut++
      }
    })

    // 3) Regenerate kwitansi (non-blokir)
    let newKwitansiPesertaUrl: string | null = null
    let newKwitansiTendaUrl: string | null = null
    let oldKwitansiPesertaUrl: string | null = null
    let oldKwitansiTendaUrl: string | null = null

    try {
      const pembayaranPeserta = sekolah.pembayaran.find((p) => p.tipe === 'PESERTA' && p.batchKe === 1)
      const pembayaranTenda = sekolah.pembayaran.find((p) => p.tipe === 'TENDA' && p.batchKe === 1)

      // Kwitansi peserta
      if (pembayaranPeserta && pembayaranPeserta.kwitansiUrl) {
        oldKwitansiPesertaUrl = pembayaranPeserta.kwitansiUrl
        const qrToken = pembayaranPeserta.qrToken ?? nanoid(24)
        const verifikasiUrl = `${getBaseUrl()}/kwitansi/verifikasi/${qrToken}`
        const qrFilename = `kwitansi-${nanoid(10)}.png`
        const qrCodeUrl = await generateQrCode(verifikasiUrl, qrFilename)
        const qrCodeBuffer = await readFile(getAbsolutePathFromUrl(qrCodeUrl))

        const pesertaCount = sekolah.peserta.filter((p) => p.tipe === 'PESERTA').length
        const pendampingCount = sekolah.peserta.filter((p) => p.tipe === 'PENDAMPING').length
        const items: KwitansiLineItem[] = [
          { label: 'Peserta', qty: pesertaCount, hargaSatuan: BIAYA_PESERTA, subtotal: pesertaCount * BIAYA_PESERTA },
          { label: 'Pendamping', qty: pendampingCount, hargaSatuan: BIAYA_PENDAMPING, subtotal: pendampingCount * BIAYA_PENDAMPING },
        ].filter((item) => item.qty > 0)

        const nomorKwitansi = `KW-${sanitizeFilename(kodeInfo.kodePendaftaran)}-PESERTA`
        newKwitansiPesertaUrl = await generateKwitansi({
          nomorKwitansi,
          tipe: 'PESERTA',
          namaSekolah: sekolah.namaLengkap,
          namaPembina: sekolah.namaPembina,
          kodePendaftaran: kodeInfo.kodePendaftaran,
          tanggalBayar: pembayaranPeserta.dibayarPada ?? pembayaranPeserta.createdAt,
          items,
          total: pembayaranPeserta.jumlahBiaya,
          qrCodeBuffer,
          filename: `${sanitizeFilename(nomorKwitansi)}-${nanoid(8)}.pdf`,
        })

        await prisma.pembayaran.update({
          where: { id: pembayaranPeserta.id },
          data: { kwitansiUrl: newKwitansiPesertaUrl },
        })
      }

      // Kwitansi tenda
      if (pembayaranTenda && pembayaranTenda.kwitansiUrl) {
        oldKwitansiTendaUrl = pembayaranTenda.kwitansiUrl
        const qrToken = pembayaranTenda.qrToken ?? nanoid(24)
        const verifikasiUrl = `${getBaseUrl()}/kwitansi/verifikasi/${qrToken}`
        const qrFilename = `kwitansi-${nanoid(10)}.png`
        const qrCodeUrl = await generateQrCode(verifikasiUrl, qrFilename)
        const qrCodeBuffer = await readFile(getAbsolutePathFromUrl(qrCodeUrl))

        const referensi = kodeInfo.kodePendaftaran ?? `SEWA-TENDA-${id}`
        const nomorKwitansi = `KW-${sanitizeFilename(referensi)}-TENDA`

        // Ambil data tenda untuk items
        const tendaSewa = await prisma.tendaSewa.findMany({
          where: { sekolahId: id },
          select: { jumlah: true, hargaSatuanSaatSewa: true, tendaJenis: { select: { nama: true } } },
        })
        const items: KwitansiLineItem[] = tendaSewa.map((ts) => ({
          label: ts.tendaJenis.nama,
          qty: ts.jumlah,
          hargaSatuan: ts.hargaSatuanSaatSewa,
          subtotal: ts.jumlah * ts.hargaSatuanSaatSewa,
        }))

        newKwitansiTendaUrl = await generateKwitansi({
          nomorKwitansi,
          tipe: 'TENDA',
          namaSekolah: sekolah.namaLengkap,
          namaPembina: sekolah.namaPembina,
          kodePendaftaran: kodeInfo.kodePendaftaran,
          tanggalBayar: pembayaranTenda.dibayarPada ?? pembayaranTenda.createdAt,
          items,
          total: pembayaranTenda.jumlahBiaya,
          qrCodeBuffer,
          filename: `${sanitizeFilename(nomorKwitansi)}-${nanoid(8)}.pdf`,
        })

        await prisma.pembayaran.update({
          where: { id: pembayaranTenda.id },
          data: { kwitansiUrl: newKwitansiTendaUrl },
        })
      }
    } catch (kwitansiError) {
      console.error('[PATCH /api/sekolah/:id/kategori] Gagal regenerate kwitansi:', kwitansiError)
    }

    // 4) Hapus kwitansi lama
    if (oldKwitansiPesertaUrl && newKwitansiPesertaUrl && oldKwitansiPesertaUrl !== newKwitansiPesertaUrl) {
      await deleteFileByUrl(oldKwitansiPesertaUrl)
    }
    if (oldKwitansiTendaUrl && newKwitansiTendaUrl && oldKwitansiTendaUrl !== newKwitansiTendaUrl) {
      await deleteFileByUrl(oldKwitansiTendaUrl)
    }

    // 5) Admin log
    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'UBAH_KATEGORI_SEKOLAH', {
      targetType: 'SEKOLAH',
      targetId: id,
      metadata: {
        namaSekolah: sekolah.namaLengkap,
        kategoriLama: sekolah.kategori,
        kategoriBaru: newKategori,
        kodeLama: sekolah.kodePendaftaran,
        kodeBaru: kodeInfo.kodePendaftaran,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Kategori berhasil diubah dari ${sekolah.kategori} menjadi ${newKategori}`,
      data: {
        kategori: newKategori,
        kodePendaftaran: kodeInfo.kodePendaftaran,
        nomorPendaftaran: kodeInfo.nomorPendaftaran,
      },
    })
  } catch (error) {
    console.error('[PATCH /api/sekolah/:id/kategori]', error)
    return NextResponse.json(
      { success: false, message: 'Gagal mengubah kategori sekolah' },
      { status: 500 }
    )
  }
}
