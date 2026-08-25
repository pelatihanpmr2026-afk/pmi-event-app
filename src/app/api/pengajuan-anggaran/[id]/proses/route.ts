import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { prosesPengajuanSchema } from '@/lib/validations/pengajuan-anggaran'
import { logAdminAction } from '@/lib/admin-log'
import { requireRole } from '@/lib/api-guard'
import { kirimNotifDisetujui, kirimNotifDitolak } from '@/lib/whatsapp'
import { buildPengajuanPdfBuffer } from '@/lib/pengajuan-pdf'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole('KEUANGAN')
    if (!guard.ok) return guard.response
    const session = guard.session

    const { id } = await params
    const body = await req.json()
    const parsed = prosesPengajuanSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Data tidak valid', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { aksi, catatanAdmin } = parsed.data

    const pengajuan = await prisma.pengajuanAnggaran.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!pengajuan) {
      return NextResponse.json({ success: false, message: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    if (pengajuan.status !== 'MENUNGGU') {
      return NextResponse.json(
        { success: false, message: 'Pengajuan ini sudah diproses sebelumnya' },
        { status: 409 }
      )
    }

    const diprosesPada = new Date()

    const updated = await prisma.$transaction(async (tx) => {
      const pengajuanUpdated = await tx.pengajuanAnggaran.update({
        where: { id },
        data: {
          status: aksi,
          catatanAdmin: aksi === 'DITOLAK' ? catatanAdmin : null,
          diprosesPada,
        },
      })

      if (aksi === 'DISETUJUI') {
        await tx.transaksiKeuangan.create({
          data: {
            tanggal: diprosesPada,
            keterangan: `Pengajuan ${pengajuan.nomorPengajuan} — ${pengajuan.namaKoordinator}`,
            jenis: 'PENGELUARAN',
            kategoriPengeluaran: 'OPERASIONAL_DIVISI',
            debit: 0,
            kredit: pengajuan.totalPengajuan,
            utang: 0,
            divisi: pengajuan.divisi,
            pic: pengajuan.namaKoordinator,
            pengajuanId: pengajuan.id,
          },
        })
      }

      return pengajuanUpdated
    })

    await logAdminAction(
  session.adminId,
  session.nama,
  session.role,
  aksi === 'DISETUJUI' ? 'SETUJUI_PENGAJUAN' : 'TOLAK_PENGAJUAN',
  {
    targetType: 'PENGAJUAN',
    targetId: id,
    metadata: {
      previousStatus: pengajuan.status,
      newStatus: aksi,
      catatanAdmin: catatanAdmin || '-'
    }
  }
)

    // Kirim notifikasi WhatsApp ke koordinator (jangan pernah gagalkan proses
    // kalau pengiriman error; hasilnya dicatat di admin log).
    try {
      const kirimHasil =
        aksi === 'DISETUJUI'
          ? await kirimNotifDisetujui({
              tujuan: pengajuan.noHp,
              nomorPengajuan: pengajuan.nomorPengajuan,
              divisi: pengajuan.divisi,
              pdfBuffer: await buildPengajuanPdfBuffer(pengajuan),
              pdfUrl: pengajuan.pdfUrl || undefined,
            })
          : await kirimNotifDitolak({
              tujuan: pengajuan.noHp,
              divisi: pengajuan.divisi,
              alasan: catatanAdmin || '',
            })

      await logAdminAction(
        session.adminId,
        session.nama,
        session.role,
        'WA_NOTIF_PENGAJUAN',
        {
          targetType: 'PENGAJUAN',
          targetId: id,
          metadata: {
            status: aksi,
            ok: kirimHasil.ok,
            dryRun: kirimHasil.dryRun,
            detail: kirimHasil.detail,
          },
        }
      )
    } catch (waError) {
      console.error('[whatsapp:notif] Gagal mengirim notifikasi pengajuan:', waError)
      await logAdminAction(
        session.adminId,
        session.nama,
        session.role,
        'WA_NOTIF_PENGAJUAN_GAGAL',
        {
          targetType: 'PENGAJUAN',
          targetId: id,
          metadata: { status: aksi, error: String(waError) },
        }
      )
    }

    return NextResponse.json({ success: true, data: { status: updated.status } })
  } catch (error) {
    console.error('[POST /api/pengajuan-anggaran/:id/proses]', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}