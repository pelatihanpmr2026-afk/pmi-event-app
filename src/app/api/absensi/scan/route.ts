import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSesiActive } from '@/lib/absensi'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const qrToken = body?.qrToken?.toString()?.trim()

    if (!qrToken) {
      return NextResponse.json(
        { success: false, message: 'QR Code tidak terbaca dengan benar' },
        { status: 400 }
      )
    }

    const panitia = await prisma.panitia.findUnique({ where: { qrToken } })

    if (!panitia) {
      return NextResponse.json(
        { success: false, message: 'QR Code tidak dikenali — bukan panitia terdaftar' },
        { status: 404 }
      )
    }

    const sesiList = await prisma.absensiSesi.findMany()
    const now = new Date()
    const activeSesi = sesiList.find((s) => isSesiActive(s, now))

    if (!activeSesi) {
      return NextResponse.json(
        { success: false, message: 'Saat ini tidak ada sesi absensi yang aktif' },
        { status: 403 }
      )
    }

    const existingLog = await prisma.absensiLog.findUnique({
      where: {
        panitiaId_sesiId: { panitiaId: panitia.id, sesiId: activeSesi.id },
      },
    })

    if (existingLog) {
      return NextResponse.json(
        {
          success: false,
          message: `${panitia.nama} sudah absen di sesi "${activeSesi.nama}" pukul ${existingLog.scannedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
        },
        { status: 409 }
      )
    }

    await prisma.absensiLog.create({
      data: { panitiaId: panitia.id, sesiId: activeSesi.id },
    })

    await prisma.panitia.update({
      where: { id: panitia.id },
      data: { status: 'HADIR' },
    })

    return NextResponse.json({
      success: true,
      message: 'Absensi berhasil dicatat',
      data: {
        nama: panitia.nama,
        divisi: panitia.divisi,
        fotoUrl: panitia.fotoUrl,
        sesi: activeSesi.nama,
      },
    })
  } catch (error) {
    console.error('[POST /api/absensi/scan]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}