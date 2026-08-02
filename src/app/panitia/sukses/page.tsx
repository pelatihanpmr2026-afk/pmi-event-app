import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DIVISI_OPTIONS, ASAL_UNIT_OPTIONS } from '@/lib/constants'
import { CheckCircle2, Download } from 'lucide-react'

function findLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((opt) => opt.value === value)?.label ?? value
}

export default async function SuksesPanitiaPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams

  if (!id) {
    return <NotFoundState />
  }

  const panitia = await prisma.panitia.findUnique({
    where: { id },
  })

  if (!panitia) {
    return <NotFoundState />
  }

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-3 text-center animate-pixel-pop">
        <div className="w-16 h-16 bg-event-yellow border-3 border-event-navy shadow-pixel flex items-center justify-center">
          <CheckCircle2 size={32} className="text-event-navy" />
        </div>
        <h1 className="font-heading text-lg sm:text-xl text-event-navy leading-relaxed">
          PENDAFTARAN BERHASIL!
        </h1>
        <p className="font-body text-xs sm:text-sm text-event-navy/70 max-w-md">
          Selamat, {panitia.nama}! Kamu resmi terdaftar sebagai panitia
          Pelantikan & Pelatihan PMR Se-Kabupaten Cianjur 2026.
        </p>
        <Badge variant="info" className="mt-1">
          {panitia.nomorRegistrasi}
        </Badge>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader variant="pink">
          <h2 className="font-heading text-xs sm:text-sm">ID CARD KAMU</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 items-center">
          <div className="relative w-full max-w-[280px] aspect-[224/295] border-3 border-event-navy shadow-pixel-lg overflow-hidden">
            <Image
              src={panitia.idCardUrl ?? ''}
              alt={`ID Card ${panitia.nama}`}
              fill
              className="object-cover"
            />
          </div>

          <a
            href={panitia.idCardUrl ?? '#'}
            download={`IDCard-${panitia.nama.replace(/\s+/g, '_')}.png`}
            className="w-full"
          >
            <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
              <Download size={16} />
              Download ID Card
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader variant="blue">
          <h2 className="font-heading text-xs sm:text-sm">QR CODE ABSENSI</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 items-center">
          <div className="relative w-48 h-48 border-3 border-event-navy shadow-pixel-lg bg-white p-2">
            <Image
              src={panitia.qrCodeUrl ?? ''}
              alt={`QR Code ${panitia.nama}`}
              fill
              className="object-contain p-2"
            />
          </div>
          <p className="font-body text-xs text-event-navy/60 text-center">
            Simpan QR Code ini — akan dipakai untuk absensi kehadiran saat hari-H event.
          </p>

          <a
            href={panitia.qrCodeUrl ?? '#'}
            download={`QRCode-${panitia.nama.replace(/\s+/g, '_')}.png`}
            className="w-full"
          >
            <Button variant="primary" className="w-full flex items-center justify-center gap-2">
              <Download size={16} />
              Download QR Code
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader variant="yellow">
          <h2 className="font-heading text-xs sm:text-sm">RINGKASAN DATA</h2>
        </CardHeader>
        <CardContent>
          <div className="border-3 border-event-navy">
            {[
              { label: 'Nama Lengkap', value: panitia.nama },
              { label: 'Asal Unit', value: findLabel(ASAL_UNIT_OPTIONS, panitia.asalUnit) },
              { label: 'Divisi', value: findLabel(DIVISI_OPTIONS, panitia.divisi) },
              { label: 'No. WhatsApp', value: panitia.noWhatsapp },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className={`flex flex-col sm:flex-row sm:items-center px-4 py-3 ${
                  i !== arr.length - 1 ? 'border-b-3 border-event-navy' : ''
                }`}
              >
                <span className="font-body font-bold text-xs text-event-navy/60 w-full sm:w-36 shrink-0">
                  {row.label}
                </span>
                <span className="font-body text-sm text-event-navy break-words">{row.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Link href="/panitia/daftar">
        <Button variant="outline">Daftar Panitia Lain</Button>
      </Link>
    </main>
  )
}

function NotFoundState() {
  return (
    <main className="min-h-screen flex flex-col gap-4 items-center justify-center px-4 text-center">
      <h1 className="font-heading text-base sm:text-lg text-event-navy">DATA TIDAK DITEMUKAN</h1>
      <p className="font-body text-xs sm:text-sm text-event-navy/70 max-w-sm">
        Link ini tidak valid atau data pendaftaran tidak ditemukan.
      </p>
      <Link href="/panitia/daftar">
        <Button variant="primary">Kembali ke Pendaftaran</Button>
      </Link>
    </main>
  )
}