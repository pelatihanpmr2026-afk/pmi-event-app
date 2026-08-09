import { prisma } from '@/lib/prisma'
import { CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { RIWAYAT_PENYAKIT_OPTIONS, RIWAYAT_PENYAKIT_PERLU_PERHATIAN, STATUS_PEMBAYARAN_CONFIG } from '@/lib/constants-sekolah'

export default async function VerifikasiKwitansiPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

const pembayaran = await prisma.pembayaran.findUnique({
    where: { qrToken: token },
    include: {
      sekolah: {
        include: {
          peserta: { select: { tipe: true, namaLengkap: true, riwayatPenyakit: true } },
          tendaSewa: { include: { tendaJenis: { select: { nama: true } } } },
        },
      },
    },
  })

  if (!pembayaran) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <XCircle size={48} className="text-pmi-red" />
        <h1 className="font-heading text-base text-event-navy">KWITANSI TIDAK VALID</h1>
        <p className="font-body text-sm text-event-navy/60 max-w-sm">
          QR Code ini tidak terdaftar di sistem. Kwitansi kemungkinan palsu atau tidak diterbitkan
          oleh panitia.
        </p>
      </main>
    )
  }

  const { sekolah } = pembayaran
  const jumlahPeserta = sekolah.peserta.filter((p) => p.tipe === 'PESERTA').length
  const jumlahPendamping = sekolah.peserta.filter((p) => p.tipe === 'PENDAMPING').length
  const pesertaDenganRiwayatPenyakit = sekolah.peserta.filter(
    (p) =>
      p.tipe === 'PESERTA' &&
      p.riwayatPenyakit &&
      RIWAYAT_PENYAKIT_PERLU_PERHATIAN.includes(p.riwayatPenyakit)
  )

  function findRiwayatLabel(value: string | null) {
    return RIWAYAT_PENYAKIT_OPTIONS.find((o) => o.value === value)?.label ?? value
  }
  const statusConfig = STATUS_PEMBAYARAN_CONFIG[pembayaran.statusPembayaran]

  const statusVisual = {
    LUNAS: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500' },
    MENUNGGU_KONFIRMASI: { icon: Clock, color: 'text-event-blue', bg: 'bg-event-blue' },
    DITOLAK: { icon: XCircle, color: 'text-pmi-red', bg: 'bg-pmi-red' },
    BELUM_BAYAR: { icon: Clock, color: 'text-event-yellow-dark', bg: 'bg-event-yellow' },
  }[pembayaran.statusPembayaran]

  const StatusIcon = statusVisual.icon

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col gap-6 items-center">
      <div className="flex items-center gap-2 bg-event-navy border-3 border-event-navy px-4 py-2">
        <ShieldCheck size={16} className="text-event-yellow" />
        <span className="font-heading text-[9px] text-white">KWITANSI RESMI TERVERIFIKASI</span>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className={`w-16 h-16 ${statusVisual.bg} border-3 border-event-navy shadow-pixel flex items-center justify-center`}
        >
          <StatusIcon size={32} className="text-white" />
        </div>
        <h1 className="font-heading text-base sm:text-lg text-event-navy leading-relaxed">
          {pembayaran.statusPembayaran === 'LUNAS'
            ? 'PEMBAYARAN LUNAS'
            : pembayaran.statusPembayaran === 'MENUNGGU_KONFIRMASI'
              ? 'MENUNGGU KONFIRMASI'
              : pembayaran.statusPembayaran === 'DITOLAK'
                ? 'PEMBAYARAN DITOLAK'
                : 'BELUM DIBAYAR'}
        </h1>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>

      {pembayaran.statusPembayaran === 'DITOLAK' && pembayaran.catatanAdmin && (
        <div className="w-full max-w-md border-3 border-pmi-red bg-pmi-red/10 p-4">
          <p className="font-body text-xs text-event-navy">
            <span className="font-bold">Alasan penolakan:</span> {pembayaran.catatanAdmin}
          </p>
        </div>
      )}

      <Card className="w-full max-w-md">
        <CardHeader variant="blue">
          <h2 className="font-heading text-xs text-white">
            {pembayaran.tipe === 'PESERTA' ? 'DATA PENDAFTARAN' : 'DATA SEWA TENDA'}
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span className="text-event-navy/60">Nama Sekolah</span>
            <span className="font-bold text-right">{sekolah.namaLengkap}</span>
          </div>
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span className="text-event-navy/60">Kode Pendaftaran</span>
            <span className="font-bold">{sekolah.kodePendaftaran}</span>
          </div>
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span className="text-event-navy/60">Pembina/Pelatih</span>
            <span className="font-bold text-right">{sekolah.namaPembina}</span>
          </div>

          <div className="flex justify-between font-body text-xs text-event-navy pt-2 border-t-2 border-event-navy/10">
            <span className="text-event-navy/60">Jumlah Peserta</span>
            <span className="font-bold">{jumlahPeserta} orang</span>
          </div>
          <div className="flex justify-between font-body text-xs text-event-navy">
            <span className="text-event-navy/60">Jumlah Pendamping</span>
            <span className="font-bold">{jumlahPendamping} orang</span>
          </div>

          {pembayaran.tipe === 'TENDA' && sekolah.tendaSewa.length > 0 && (
            <div className="pt-2 border-t-2 border-event-navy/10 flex flex-col gap-1.5">
              <span className="font-body text-xs text-event-navy/60">Tenda yang Disewa</span>
              {sekolah.tendaSewa.map((t) => (
                <div key={t.id} className="flex justify-between font-body text-xs text-event-navy">
                  <span>{t.tendaJenis.nama}</span>
                  <span className="font-bold">{t.jumlah} unit</span>
                </div>
              ))}
            </div>
          )}

          {pembayaran.tipe === 'PESERTA' && pesertaDenganRiwayatPenyakit.length > 0 && (
            <div className="pt-2 border-t-2 border-event-navy/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={14} className="text-pmi-red" />
                <span className="font-body text-xs font-bold text-pmi-red">
                  Peserta dengan Riwayat Penyakit
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {pesertaDenganRiwayatPenyakit.map((p, i) => (
                  <div key={i} className="flex justify-between font-body text-xs text-event-navy">
                    <span className="font-bold">{p.namaLengkap}</span>
                    <span className="text-event-navy/60">{findRiwayatLabel(p.riwayatPenyakit)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pembayaran.tipe === 'PESERTA' && pembayaran.statusPembayaran === 'LUNAS' && (
            <div className="flex justify-between items-center font-body text-xs text-event-navy pt-2 border-t-2 border-event-navy/10">
              <span className="text-event-navy/60">Status Daftar Ulang</span>
              <Badge variant={pembayaran.statusDaftarUlang ? 'success' : 'warning'}>
                {pembayaran.statusDaftarUlang ? 'Sudah Daftar Ulang' : 'Belum Daftar Ulang'}
              </Badge>
            </div>
          )}

          {pembayaran.tipe === 'PESERTA' && pembayaran.statusPembayaran === 'LUNAS' && (
            <div className="flex justify-between items-center font-body text-xs text-event-navy pt-2 border-t-2 border-event-navy/10">
              <span className="text-event-navy/60">Status Daftar Ulang</span>
              <Badge variant={pembayaran.statusDaftarUlang ? 'success' : 'warning'}>
                {pembayaran.statusDaftarUlang ? 'Sudah Daftar Ulang' : 'Belum Daftar Ulang'}
              </Badge>
            </div>
          )}

          <div className="flex justify-between font-heading text-xs text-event-navy pt-2 border-t-2 border-event-navy/20">
            <span>TOTAL</span>
            <span>Rp{pembayaran.jumlahBiaya.toLocaleString('id-ID')}</span>
          </div>
        </CardContent>
      </Card>

      <p className="font-body text-[11px] text-event-navy/50 text-center max-w-sm">
        Halaman ini menampilkan status terkini langsung dari sistem panitia. Status pada lembar
        kwitansi tercetak mungkin berbeda jika sudah ada pembaruan setelah kwitansi diterbitkan.
      </p>
    </main>
  )
}