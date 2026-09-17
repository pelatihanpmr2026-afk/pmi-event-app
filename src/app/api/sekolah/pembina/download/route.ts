import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-guard'
import { logAdminAction } from '@/lib/admin-log'

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const kategori = req.nextUrl.searchParams.get('kategori')?.toUpperCase()
    if (kategori !== 'WIRA' && kategori !== 'MADYA') {
      return NextResponse.json(
        { success: false, message: 'Parameter kategori harus WIRA atau MADYA' },
        { status: 400 }
      )
    }

    const sekolahList = await prisma.sekolah.findMany({
      where: { kategori },
      select: {
        nomorPendaftaran: true,
        namaLengkap: true,
        namaPembina: true,
        noWhatsappPembina: true,
        jenjang: true,
        statusSekolah: true,
      },
      orderBy: { nomorPendaftaran: 'asc' },
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(`Data Pembina ${kategori}`)

    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'No. Pendaftaran', key: 'nomor', width: 16 },
      { header: 'Nama Sekolah', key: 'namaSekolah', width: 35 },
      { header: 'Jenjang', key: 'jenjang', width: 10 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Nama Pembina', key: 'namaPembina', width: 28 },
      { header: 'No. WhatsApp', key: 'noHp', width: 18 },
    ]

    // Header row styling
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3653A5' } }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 24

    sekolahList.forEach((s, i) => {
      sheet.addRow({
        no: i + 1,
        nomor: s.nomorPendaftaran ? String(s.nomorPendaftaran).padStart(3, '0') : '-',
        namaSekolah: s.namaLengkap,
        jenjang: s.jenjang,
        status: s.statusSekolah,
        namaPembina: s.namaPembina,
        noHp: s.noWhatsappPembina ?? '-',
      })
    })

    // Auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sekolahList.length + 1, column: 7 },
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const now = new Date()
    const filename = `Data_Pembina_${kategori}_${ymd(now)}.xlsx`

    await logAdminAction(guard.session.adminId, guard.session.nama, guard.session.role, 'DOWNLOAD_PEMBINA', {
      targetType: 'SEKOLAH',
      metadata: { kategori, jumlahSekolah: sekolahList.length },
    })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/sekolah/pembina/download]', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
