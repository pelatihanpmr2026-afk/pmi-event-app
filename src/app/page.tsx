import Image from 'next/image'
import Link from 'next/link'
import { School, Tent, Sparkles, MapPin, Calendar, ChevronDown, Users, HeartHandshake } from 'lucide-react'
import { HomeNavbar } from '@/components/home/home-navbar'
import { PixelClouds } from '@/components/home/pixel-clouds'
import { CountdownTimer } from '@/components/home/countdown-timer'
import { PixelMarquee } from '@/components/home/pixel-marquee'
import { ActionCard } from '@/components/home/action-card'
import { StatCounter } from '@/components/home/stat-counter'
import { PixelTimeline } from '@/components/home/pixel-timeline'
import { PixelFaq } from '@/components/home/pixel-faq'
import { HeroAurora } from '@/components/home/hero-aurora'
import { SectionHeader } from '@/components/home/section-header'
import { Reveal } from '@/components/home/scroll-reveal'
import { prisma } from '@/lib/prisma'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from '@/lib/constants-sekolah'

export const dynamic = 'force-dynamic'

// TODO: Sesuaikan dengan tanggal event yang sebenarnya
const EVENT_DATE = '2026-09-15T07:00:00'

const MARQUEE_ITEMS = [
  'PENDAFTARAN DIBUKA',
  'PELANTIKAN & PELATIHAN PMR 2026',
  'SE-KABUPATEN CIANJUR',
  'WIRA & MADYA',
]

const TIMELINE_ITEMS = [
  {
    label: 'TAHAP 1',
    title: 'Pendaftaran Sekolah',
    description: 'Isi data sekolah, peserta, dan pendamping secara online',
    status: 'active' as const,
  },
  {
    label: 'TAHAP 2',
    title: 'Pembayaran & Verifikasi',
    description: 'Transfer biaya pendaftaran dan upload bukti untuk diverifikasi panitia',
    status: 'upcoming' as const,
  },
  {
    label: 'TAHAP 3',
    title: 'Sewa Tenda (Opsional)',
    description: 'Sewa tenda dari panitia atau bawa perlengkapan sendiri',
    status: 'upcoming' as const,
  },
  {
    label: 'TAHAP 4',
    title: 'Daftar Ulang di Lokasi',
    description: 'Tunjukkan QR Code pada kwitansi saat hari-H untuk konfirmasi kehadiran',
    status: 'upcoming' as const,
  },
]

const FAQ_ITEMS = [
  {
    q: 'Siapa saja yang bisa mendaftar?',
    a: 'Sekolah tingkat SMP/MTs (kategori Madya) dan SMA/SMK/MA (kategori Wira) se-Kabupaten Cianjur.',
  },
  {
    q: 'Berapa biaya pendaftarannya?',
    a: `Biaya pendaftaran Rp${BIAYA_PESERTA.toLocaleString('id-ID')} per peserta dan Rp${BIAYA_PENDAMPING.toLocaleString('id-ID')} per pendamping.`,
  },
  {
    q: 'Apakah jumlah peserta dibatasi?',
    a: 'Tidak ada batasan jumlah peserta maupun pendamping yang bisa didaftarkan per sekolah.',
  },
  {
    q: 'Bagaimana kalau kami ingin menyewa tenda?',
    a: 'Sewa tenda dilakukan terpisah lewat halaman Sewa Tenda, bisa sebelum atau sesudah pendaftaran peserta.',
  },
  {
    q: 'Bagaimana cara pembayarannya?',
    a: 'Pembayaran dilakukan lewat transfer bank, lalu upload bukti transfer di sistem untuk dikonfirmasi panitia.',
  },
]

const FEATURES = [
  {
    icon: Users,
    title: 'PELANTIKAN',
    desc: 'Pengukuhan resmi anggota PMR baru dari seluruh sekolah se-Kabupaten Cianjur.',
    accent: 'from-event-pink to-event-blue',
    chip: 'bg-event-pink/10 text-event-pink border-event-pink/30',
  },
  {
    icon: HeartHandshake,
    title: 'PELATIHAN',
    desc: 'Materi kepalangmerahan, pertolongan pertama, dan kesiapsiagaan bencana.',
    accent: 'from-event-blue to-event-navy',
    chip: 'bg-event-blue/10 text-event-blue border-event-blue/30',
  },
  {
    icon: Tent,
    title: 'PERKEMAHAN',
    desc: 'Kegiatan lapangan, giat malam, dan kebersamaan lintas sekolah.',
    accent: 'from-event-yellow to-event-pink',
    chip: 'bg-event-yellow/20 text-event-navy border-event-yellow/40',
  },
]

const NAV_LINKS_FOOTER = [
  { href: '#tentang', label: 'Tentang' },
  { href: '#daftar', label: 'Daftar' },
  { href: '#timeline', label: 'Timeline' },
  { href: '#faq', label: 'FAQ' },
]

export default async function HomePage() {
  // Hapus query panitia
  const [totalSekolah, totalPeserta] = await Promise.all([
    prisma.sekolah.count(),
    prisma.peserta.count({ where: { tipe: 'PESERTA' } }),
  ])

  return (
    <>
      <PixelClouds />
      <HomeNavbar />
      <main className="relative">
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden px-4 sm:px-6 pt-10 pb-16 sm:pt-16 sm:pb-28">
          <HeroAurora />
          <div className="relative max-w-5xl mx-auto flex flex-col items-center gap-6 sm:gap-8 text-center">
            <Reveal y={14}>
              <div className="inline-flex items-center gap-2 bg-white border-2 border-event-navy shadow-pixel-sm px-4 py-2">
                <HeartHandshake size={14} className="text-event-pink" />
                <span className="font-heading text-[9px] text-event-navy">PMI KABUPATEN CIANJUR</span>
              </div>
            </Reveal>

            <Reveal delay={80} y={18}>
              <div className="relative float-slow w-full max-w-[220px] sm:max-w-[400px]">
                <div className="absolute -inset-2 sm:-inset-3 border-2 border-event-navy/20" aria-hidden="true" />
                <div className="relative bg-white border-3 border-event-navy shadow-pixel-lg px-3 py-3 sm:px-5 sm:py-4 -rotate-1">
                  <div className="flex items-center justify-between mb-2 px-0.5" aria-hidden="true">
                    <span className="w-2.5 h-2.5 bg-event-pink border border-event-navy" />
                    <span className="w-2.5 h-2.5 bg-event-yellow border border-event-navy" />
                    <span className="w-2.5 h-2.5 bg-event-blue border border-event-navy" />
                  </div>
                  <Image
                    src="/assets/LogoEvent.png"
                    alt="Pelantikan & Pelatihan PMR 2026 Se-Kabupaten Cianjur"
                    width={842}
                    height={482}
                    className="w-full h-auto"
                    priority
                  />
                </div>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <h1 className="font-heading gradient-text pixel-shadow-soft text-[clamp(1.35rem,1rem+4vw,3rem)] leading-tight sm:leading-[1.15]">
                PELANTIKAN &amp; PELATIHAN
                <br />
                PMR SE-KABUPATEN CIANJUR
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="font-body text-xs sm:text-base text-gray-500 max-w-xl leading-relaxed">
                Tahun 2026 · Bersama membangun generasi Palang Merah Remaja yang tangguh, terampil,
                dan berjiwa kemanusiaan.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-4">
                <div className="flex items-center gap-2 bg-white border-2 border-event-navy/25 shadow-[var(--shadow-soft)] px-4 py-2.5">
                  <Calendar size={16} className="text-event-pink" />
                  <span className="font-body font-semibold text-sm text-event-navy">
                    {new Date(EVENT_DATE).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white border-2 border-event-navy/25 shadow-[var(--shadow-soft)] px-4 py-2.5">
                  <MapPin size={16} className="text-event-blue" />
                  <span className="font-body font-semibold text-sm text-event-navy">Kabupaten Cianjur</span>
                </div>
              </div>
            </Reveal>

            <Reveal delay={280}>
              <div className="flex flex-col items-center gap-2">
                <span className="font-body text-[10px] text-gray-400 uppercase tracking-[0.2em]">Menuju Hari-H</span>
                <CountdownTimer targetDate={EVENT_DATE} />
              </div>
            </Reveal>

            <Reveal delay={320} y={16}>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-1">
                <Link href="/sekolah/daftar" className="w-full sm:w-auto min-h-[48px]">
                  <div className="font-heading text-[11px] bg-event-pink text-white border-3 border-event-navy rounded-[var(--radius-btn)] shadow-pixel px-8 py-3.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0 active:translate-y-0 active:shadow-none transition-all text-center flex items-center justify-center gap-2">
                    DAFTAR SEKOLAH
                    <Sparkles size={14} />
                  </div>
                </Link>
                <Link href="/tenda/sewa" className="w-full sm:w-auto min-h-[48px]">
                  <div className="font-heading text-[11px] bg-white text-event-navy border-3 border-event-navy rounded-[var(--radius-btn)] shadow-pixel px-8 py-3.5 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0 active:translate-y-0 active:shadow-none transition-all text-center flex items-center justify-center gap-2">
                    <Tent size={14} />
                    SEWA TENDA
                  </div>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={380} y={6}>
              <div className="w-8 h-12 border-2 border-event-navy/25 rounded-full flex items-start justify-center pt-2 mt-3">
                <ChevronDown size={14} className="text-event-navy/40 animate-scroll-hint" />
              </div>
            </Reveal>
          </div>
        </section>

        <PixelMarquee items={MARQUEE_ITEMS} variant="pink" />

        {/* ===== STATS ===== */}
        <section className="px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              <Reveal delay={0}>
                <div className="relative bg-white border-2 border-event-navy shadow-pixel overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-event-navy via-event-blue to-event-pink" />
                  <div className="px-3 py-6 sm:px-6 sm:py-8">
                    <StatCounter value={totalSekolah} label="Sekolah Terdaftar" />
                  </div>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="relative bg-white border-2 border-event-navy shadow-pixel overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-event-pink via-event-yellow to-event-blue" />
                  <div className="px-3 py-6 sm:px-6 sm:py-8">
                    <StatCounter value={totalPeserta} label="Peserta" />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== TENTANG ===== */}
        <section id="tentang" className="px-4 sm:px-6 py-12 sm:py-16 scroll-mt-20 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-event-navy/20 to-transparent" aria-hidden="true" />
          <div className="max-w-4xl mx-auto flex flex-col gap-8 sm:gap-10">
            <Reveal>
              <SectionHeader
                badge="TENTANG EVENT"
                tone="yellow"
                title={
                  <>
                    SATU EVENT,<br />SERIBU PENGALAMAN
                  </>
                }
                subtitle="Pelantikan & Pelatihan PMR Se-Kabupaten Cianjur 2026 adalah ajang berkumpulnya anggota Palang Merah Remaja tingkat Madya dan Wira untuk dilantik, dilatih, dan mempererat solidaritas kemanusiaan."
              />
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {FEATURES.map((item, i) => (
                <Reveal key={item.title} delay={i * 100}>
                  <div className="group h-full bg-white border-2 border-event-navy shadow-pixel transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-lg flex flex-col">
                    <div className={`h-1.5 bg-gradient-to-r ${item.accent}`} />
                    <div className="px-4 py-5 flex flex-col items-center text-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-event-navy text-white border-2 border-event-navy shadow-pixel-sm flex items-center justify-center transition-transform duration-150 group-hover:-translate-y-1">
                        <item.icon size={22} />
                      </div>
                      <h3 className="font-heading text-[10px] sm:text-xs text-event-navy">{item.title}</h3>
                      <p className="font-body text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                      <span className={`mt-auto font-heading text-[8px] px-2 py-1 border ${item.chip}`}>
                        PMR
                      </span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <PixelMarquee items={['DAFTAR SEKARANG', 'KUOTA TERBATAS', 'JANGAN SAMPAI KETINGGALAN']} variant="yellow" />

        {/* ===== PENDAFTARAN ===== */}
        <section id="daftar" className="px-4 sm:px-6 py-12 sm:py-16 scroll-mt-20">
          <div className="max-w-3xl mx-auto flex flex-col gap-8 sm:gap-10">
            <Reveal>
              <SectionHeader
                badge="PENDAFTARAN"
                tone="pink"
                title="PILIH JALURMU"
                subtitle="Dua jalur pendaftaran yang bisa dilakukan sesuai kebutuhan sekolah."
              />
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <Reveal delay={80}>
                <ActionCard
                  href="/sekolah/daftar"
                  icon={School}
                  title="PENDAFTARAN SEKOLAH"
                  badge="Untuk Pembina/Pelatih"
                  description={`Daftarkan sekolahmu beserta peserta dan pendamping. Biaya mulai Rp${BIAYA_PESERTA.toLocaleString('id-ID')}/orang.`}
                  variant="pink"
                />
              </Reveal>
              <Reveal delay={180}>
                <ActionCard
                  href="/tenda/sewa"
                  icon={Tent}
                  title="SEWA TENDA"
                  badge="Opsional"
                  description="Sewa tenda dari panitia untuk perkemahan. Bisa dilakukan sebelum atau sesudah daftar sekolah."
                  variant="yellow"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== TIMELINE ===== */}
        <section id="timeline" className="px-4 sm:px-6 py-12 sm:py-16 scroll-mt-20 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-event-navy/20 to-transparent" aria-hidden="true" />
          <div className="max-w-2xl mx-auto flex flex-col gap-8 sm:gap-10">
            <Reveal>
              <SectionHeader
                badge="ALUR PENDAFTARAN"
                tone="blue"
                title="CARA IKUTAN"
                subtitle="Empat tahap sederhana menuju hari pelantikan."
              />
            </Reveal>
            <Reveal delay={120}>
              <div className="bg-white border-2 border-event-navy shadow-pixel p-5 sm:p-8">
                <PixelTimeline items={TIMELINE_ITEMS} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="px-4 sm:px-6 py-12 sm:py-16 scroll-mt-20 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-event-navy/20 to-transparent" aria-hidden="true" />
          <div className="max-w-2xl mx-auto flex flex-col gap-8 sm:gap-10">
            <Reveal>
              <SectionHeader
                badge="FAQ"
                tone="yellow"
                title="PERTANYAAN UMUM"
                subtitle="Temukan jawaban atas pertanyaan yang paling sering diajukan."
              />
            </Reveal>
            <Reveal delay={120}>
              <PixelFaq items={FAQ_ITEMS} />
            </Reveal>
          </div>
        </section>

        {/* ===== CTA FINAL ===== */}
        <section className="px-4 sm:px-6 py-12 sm:py-24">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <div className="relative bg-event-navy border-3 border-event-navy shadow-pixel-xl p-7 sm:p-14 overflow-hidden">
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                  aria-hidden="true"
                />
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-event-pink/40 blur-3xl" aria-hidden="true" />
                <div className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-event-blue/40 blur-3xl" aria-hidden="true" />
                <div className="absolute top-8 right-8 w-3 h-3 bg-event-yellow" aria-hidden="true" />
                <div className="absolute bottom-10 left-10 w-2 h-2 bg-event-pink" aria-hidden="true" />

                <div className="relative flex flex-col items-center text-center gap-5">
                  <span className="font-heading text-[9px] text-event-yellow border-2 border-event-yellow/40 px-4 py-1.5">
                    HARI-H TINGGAL MENGHITUNG
                  </span>
                  <h2 className="font-heading text-[clamp(1.2rem,1rem+3vw,2rem)] text-white leading-relaxed pixel-shadow-soft">
                    SIAP BERGABUNG?
                  </h2>
                  <p className="font-body text-xs sm:text-sm text-white/70 max-w-md leading-relaxed">
                    Daftarkan sekolahmu sekarang dan jadi bagian dari Pelantikan &amp; Pelatihan PMR Se-Kabupaten Cianjur 2026.
                  </p>
                  <Link href="/sekolah/daftar" className="min-h-[48px] inline-flex">
                    <div className="font-heading text-[11px] bg-event-yellow text-event-navy border-2 border-event-navy rounded-[var(--radius-btn)] shadow-pixel px-9 py-4 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg active:translate-x-0 active:translate-y-0 active:shadow-none transition-all flex items-center gap-2">
                      DAFTAR SEKARANG
                      <Sparkles size={14} />
                    </div>
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="border-t-2 border-event-navy/15 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-10">
                  <Image src="/assets/LogoPMI.jpg" alt="Logo PMI" fill className="object-contain" />
                </div>
                <div className="w-[3px] h-10 bg-[var(--color-border)]" />
                <div className="relative w-20 h-12">
                  <Image src="/assets/LogoEvent.png" alt="Logo Event" fill className="object-contain" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                {NAV_LINKS_FOOTER.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="font-body text-xs font-medium text-gray-500 hover:text-event-navy transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-event-navy/20 to-transparent" aria-hidden="true" />
            <p className="font-body text-[11px] text-gray-400 text-center">
              © 2026 Palang Merah Indonesia Kabupaten Cianjur
              <br />
              Pelantikan &amp; Pelatihan PMR Se-Kabupaten Cianjur
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}