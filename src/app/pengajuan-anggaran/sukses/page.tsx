import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DownloadPengajuanButton } from '@/components/pengajuan/download-pengajuan-button'
import { DIVISI_OPTIONS } from '@/lib/constants'

const STATUS_PENGAJUAN = {
  MENUNGGU: { label: 'Menunggu Diproses', variant: 'warning' as const },
  DISETUJUI: { label: 'Disetujui', variant: 'success' as const },
  DITOLAK: { label: 'Ditolak', variant: 'danger' as const },
}

export default async function SuksesPengajuanPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams

  if (!id) return <NotFoundState />

  const pengajuan = await prisma.pengajuanAnggaran.findUnique({ where: { id } })

  if (!pengajuan) return <NotFoundState />

  const status = STATUS_PENGAJUAN[pengajuan.status]

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col gap-6 items-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 bg-event-yellow border-3 border-event-navy shadow-pixel flex items-center justify-center">
          <CheckCircle2 size={32} className="text-event-navy" />
        </div>
        <h1 className="font-heading text-lg text-event-navy">PENGAJUAN TERKIRIM</h1>
        <p className="font-body text-sm text-event-navy/70 max-w-sm">
          Pengajuan anggaran kamu sudah diterima. Pantau statusnya di halaman ini — simpan
          linknya (nomor pengajuan di bawah) untuk memeriksa lagi nanti.
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader variant="blue">
          <h2 className="font-heading text-xs text-white">RINGKASAN</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex justify-between items-center font-body text-xs text-event-navy">
            <span className="text-event-navy/60">Status</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span className="text-event-navy/60">Nomor Pengajuan</span>
            <span className="font-bold">{pengajuan.nomorPengajuan}</span>
          </div>
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span className="text-event-navy/60">Koordinator</span>
            <span className="font-bold">{pengajuan.namaKoordinator}</span>
          </div>
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span className="text-event-navy/60">Divisi</span>
            <span className="font-bold">
              {DIVISI_OPTIONS.find((d) => d.value === pengajuan.divisi)?.label}
            </span>
          </div>
          <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20">
            <span>TOTAL PENGAJUAN</span>
            <span>Rp{pengajuan.totalPengajuan.toLocaleString('id-ID')}</span>
          </div>
        </CardContent>
      </Card>

      {pengajuan.status === 'DITOLAK' && pengajuan.catatanAdmin && (
        <div className="w-full max-w-md border-3 border-pmi-red bg-pmi-red/10 p-4">
          <p className="font-body font-bold text-xs text-pmi-red mb-1">Alasan penolakan:</p>
          <p className="font-body text-xs text-event-navy">{pengajuan.catatanAdmin}</p>
        </div>
      )}

      {pengajuan.status === 'DISETUJUI' && pengajuan.diprosesPada && (
        <div className="w-full max-w-md border-3 border-green-600 bg-green-50 p-4">
          <p className="font-body text-xs text-event-navy">
            Pengajuan disetujui pada{' '}
            {pengajuan.diprosesPada.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            .
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-md">
        <DownloadPengajuanButton pengajuanId={pengajuan.id} />
        {pengajuan.status === 'MENUNGGU' && (
          <Link href={`/pengajuan-anggaran/${pengajuan.id}/edit`} className="w-full">
            <Button variant="primary" className="w-full">
              Edit / Tambah Barang
            </Button>
          </Link>
        )}
      </div>
    </main>
  )
}

function NotFoundState() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-heading text-base text-event-navy">DATA TIDAK DITEMUKAN</h1>
      <Link href="/pengajuan-anggaran/ajukan">
        <Button variant="primary">Kembali ke Form</Button>
      </Link>
    </main>
  )
}