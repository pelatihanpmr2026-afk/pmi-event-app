import Image from 'next/image'
import Link from 'next/link'
import { School, Tent, Users, Sparkles, MapPin, Calendar, ChevronDown, Radio, ArrowRight } from 'lucide-react'
import { HomeNavbar } from '@/components/home/home-navbar'
import { PixelClouds } from '@/components/home/pixel-clouds'
import { CountdownTimer } from '@/components/home/countdown-timer'
import { PixelMarquee } from '@/components/home/pixel-marquee'
import { ActionCard } from '@/components/home/action-card'
import { StatCounter } from '@/components/home/stat-counter'
import { PixelTimeline } from '@/components/home/pixel-timeline'
import { PixelFaq } from '@/components/home/pixel-faq'
import { Reveal } from '@/components/home/scroll-reveal'
import { ScanlineOverlay, ScrollProgressBar, BackToTop } from '@/components/home/retro-fx'
import { HeroParallax } from '@/components/home/hero-parallax'
import { HudStrip } from '@/components/home/hud-strip'
import { SectionEyebrow } from '@/components/home/section-eyebrow'
import { prisma } from '@/lib/prisma'
import { BIAYA_PESERTA, BIAYA_PENDAMPING } from '@/lib/constants-sekolah'

export const dynamic = 'force-dynamic'

// TODO: sesuaikan dengan tanggal event yang sebenarnya
const EVENT_DATE = '2026-09-18T07:00:00'

const MARQUEE_ITEMS = [
  'PENDAFTARAN DIBUKA',
  'PELANTIKAN & PELATIHAN PMR 2026',
  'SE-KABUPATEN CIANJUR',
  'WIRA & MADYA',
  'AYO DAFTARKAN SEKOLAHMU',
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
    a: 'Sekolah tingkat SMP/MTs (kategori Madya) dan SMA/SMK/MA (kategori Wira) se-Kabupaten Cianjur. Pendaftaran dilakukan oleh pembina/pelatih PMR masing-masing sekolah.',
  },
  {
    q: 'Berapa biaya pendaftarannya?',
    a: `Biaya pendaftaran Rp${BIAYA_PESERTA.toLocaleString('id-ID')} per peserta dan Rp${BIAYA_PENDAMPING.toLocaleString('id-ID')} per pendamping. Total dihitung otomatis oleh sistem setelah data peserta diisi.`,
  },
  {
    q: 'Apakah jumlah peserta dibatasi?',
    a: 'Tidak ada batasan jumlah peserta maupun pendamping yang bisa didaftarkan per sekolah. Silakan daftarkan sebanyak yang sekolah kirimkan.',
  },
  {
    q: 'Bagaimana kalau kami ingin menyewa tenda?',
    a: 'Sewa tenda dilakukan terpisah lewat halaman Sewa Tenda, bisa sebelum atau sesudah pendaftaran peserta. Total kapasitas tenda yang bisa disewa menyesuaikan jumlah peserta + pendamping + toleransi 15 orang dari panitia.',
  },
  {
    q: 'Bagaimana cara pembayarannya?',
    a: 'Pembayaran dilakukan lewat transfer bank, lalu upload bukti transfer di sistem. Panitia akan memverifikasi, dan kwitansi resmi akan otomatis digenerate setelah pembayaran dikonfirmasi.',
  },
]

// Deterministic pixel-block skyline silhouette rendered under the hero — no image asset needed.
const SKYLINE_BLOCKS = Array.from({ length: 40 }, (_, i) => 10 + Math.round((Math.sin(i * 0.85) + 1) * 11))

// Total number of "chapters" on the page — feeds the HUD index (01/06 etc.) throughout.
const SECTION_COUNT = 6

/** Small HUD-style signal pips showing progress through the registration flow (real sequence → numbering is meaningful here). */
function TimelinePips({ items }: { items: typeof TIMELINE_ITEMS }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {items.map((item) => (
        <span
          key={item.label}
          className={`h-2 w-7 sm:w-9 ${item.status === 'active' ? 'bg-event-pink' : 'bg-event-navy/15'}`}
        />
      ))}
    </div>
  )
}

/** Corner-bracket HUD frame — decorative only, echoes the "digital portal" motif around key panels. */
function HudCorners({ tone = 'navy' }: { tone?: 'navy' | 'white' }) {
  const color = tone === 'navy' ? 'border-event-navy/25' : 'border-white/30'
  const base = 'absolute w-4 h-4 sm:w-6 sm:h-6'
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <span className={`${base} top-2 left-2 border-t-3 border-l-3 ${color}`} />
      <span className={`${base} top-2 right-2 border-t-3 border-r-3 ${color}`} />
      <span className={`${base} bottom-2 left-2 border-b-3 border-l-3 ${color}`} />
      <span className={`${base} bottom-2 right-2 border-b-3 border-r-3 ${color}`} />
    </div>
  )
}

export default async function HomePage() {
  const [totalSekolah, totalPeserta] = await Promise.all([
    prisma.sekolah.count(),
    prisma.peserta.count({ where: { tipe: 'PESERTA' } }),
  ])

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] font-heading text-[10px] bg-event-yellow text-event-navy border-3 border-event-navy px-4 py-2 shadow-pixel-sm"
      >
        LOMPAT KE KONTEN
      </a>

      <ScanlineOverlay />
      <ScrollProgressBar />
      <PixelClouds />
      <HomeNavbar />

      <main id="main-content" className="relative overflow-x-clip">
        {/* ===== HERO ===== */}
        <section className="relative px-4 sm:px-6 pt-8 pb-24 sm:pt-12 sm:pb-32 overflow-hidden">
          {/* animated pixel grid background — subtle, GPU-friendly (opacity only) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(54,83,165,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(54,83,165,0.6) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 40%, transparent 90%)',
            }}
          />

          {/* ambient floating pixels */}
          <span aria-hidden="true" className="pixel-particle hidden sm:block absolute top-24 left-[12%] w-3 h-3 bg-event-pink" style={{ animationDelay: '0s' }} />
          <span aria-hidden="true" className="pixel-particle hidden sm:block absolute top-40 right-[15%] w-2.5 h-2.5 bg-event-blue" style={{ animationDelay: '0.9s' }} />
          <span aria-hidden="true" className="pixel-particle hidden sm:block absolute bottom-32 left-[20%] w-2 h-2 bg-event-yellow" style={{ animationDelay: '1.6s' }} />
          <span aria-hidden="true" className="pixel-particle hidden sm:block absolute bottom-20 right-[22%] w-3 h-3 bg-event-pink" style={{ animationDelay: '0.4s' }} />

          <div className="max-w-5xl mx-auto flex flex-col gap-8">
            {/* HUD status readout — sets the "digital portal" tone before anything else loads */}
            <Reveal>
              <HudStrip index={1} total={SECTION_COUNT} />
            </Reveal>

            <div className="flex flex-col items-center gap-8 text-center">
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="hidden sm:block absolute -inset-6 pixel-corners bg-event-yellow/20 blur-2xl"
                />
                <HeroParallax className="relative w-full max-w-md sm:max-w-lg animate-glitch">
                  <Image
                    src="/assets/LogoEvent.png"
                    alt="Pelantikan & Pelatihan PMR 2026 Se-Kabupaten Cianjur"
                    width={842}
                    height={482}
                    className="w-full h-auto drop-shadow-[6px_6px_0px_rgba(28,37,65,0.12)]"
                    priority
                  />
                </HeroParallax>
              </div>

              <Reveal delay={80} className="flex flex-col items-center gap-2">
                <span className="inline-flex items-center gap-1.5 font-heading text-[8px] sm:text-[9px] text-event-navy/40 tracking-[0.2em]">
                  <Radio size={10} className="text-event-pink animate-blink" />
                  PENDAFTARAN RESMI &middot;
                </span>
                <h1 className="font-heading text-lg sm:text-2xl text-event-navy leading-relaxed pixel-shadow-text-sm max-w-2xl">
                  PELANTIKAN &amp; PELATIHAN PMR 2026
                </h1>
              </Reveal>

              <Reveal delay={140} className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
                <div className="pixel-corners-sm flex items-center gap-2 bg-white border-3 border-event-navy px-4 py-2.5 shadow-pixel-sm hover:-translate-y-0.5 transition-transform">
                  <Calendar size={16} className="text-event-pink" />
                  <span className="font-body font-bold text-xs text-event-navy">
                    {new Date(EVENT_DATE).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="pixel-corners-sm flex items-center gap-2 bg-white border-3 border-event-navy px-4 py-2.5 shadow-pixel-sm hover:-translate-y-0.5 transition-transform">
                  <MapPin size={16} className="text-event-blue" />
                  <span className="font-body font-bold text-xs text-event-navy">
                    Kabupaten Cianjur
                  </span>
                </div>
              </Reveal>

              <Reveal delay={200} className="flex flex-col items-center gap-4">
                <span className="font-heading text-[10px] sm:text-xs text-event-navy/50 uppercase tracking-widest">
                  Menuju Hari-H
                </span>
                <div className="relative pixel-corners bg-white/80 border-3 border-event-navy shadow-pixel px-5 py-4 sm:px-7 sm:py-5">
                  <HudCorners tone="navy" />
                  <CountdownTimer targetDate={EVENT_DATE} />
                </div>
              </Reveal>

              <Reveal delay={260} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2">
                <Link href="/sekolah/daftar" className="w-full sm:w-auto group">
                  <div className="shimmer-hover font-heading text-[11px] bg-event-pink text-white border-3 border-event-navy shadow-pixel px-8 py-4 hover:bg-event-pink-dark active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all text-center inline-flex items-center justify-center gap-2">
                    DAFTAR SEKOLAH
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
                <Link href="/tenda/sewa" className="w-full sm:w-auto group">
                  <div className="shimmer-hover font-heading text-[11px] bg-white text-event-navy border-3 border-event-navy shadow-pixel px-8 py-4 hover:bg-event-cream active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all text-center inline-flex items-center justify-center gap-2">
                    SEWA TENDA
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </Reveal>

              <div className="flex flex-col items-center gap-1 mt-4">
                <span className="font-heading text-[8px] text-event-navy/35 tracking-widest">GULIR</span>
                <ChevronDown size={22} className="text-event-navy/30 animate-scroll-hint" />
              </div>
            </div>
          </div>

          {/* pixel-block skyline horizon */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[1px] opacity-[0.08] overflow-hidden"
            style={{ height: 44 }}
          >
            {SKYLINE_BLOCKS.map((h, i) => (
              <span key={i} className="w-[3px] sm:w-[5px] bg-event-navy" style={{ height: h }} />
            ))}
          </div>
        </section>

        <PixelMarquee items={MARQUEE_ITEMS} variant="pink" />

        {/* ===== STATS ===== */}
        <section className="px-4 sm:px-6 py-12 sm:py-16">
          <Reveal className="max-w-4xl mx-auto">
            <div className="relative pixel-corners bg-white border-3 border-event-navy shadow-pixel-lg px-6 py-8">
              <HudCorners tone="navy" />
              <div className="flex items-center justify-center gap-2 mb-6">
                <Radio size={12} className="text-event-pink animate-blink" />
                <span className="font-heading text-[9px] text-event-navy/50 tracking-widest">DATA LANGSUNG</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-8">
                <div className="flex flex-col items-center gap-2 group">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 pixel-corners-sm bg-event-navy/5 border-2 border-event-navy/15 flex items-center justify-center transition-colors group-hover:bg-event-pink/10 group-hover:border-event-pink/30">
                    <School size={18} className="text-event-navy/40 transition-colors group-hover:text-event-pink" />
                  </div>
                  <StatCounter value={totalSekolah} label="Sekolah Terdaftar" />
                </div>
                <div className="flex flex-col items-center gap-2 border-l-2 border-r-2 border-event-navy/10 group">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 pixel-corners-sm bg-event-navy/5 border-2 border-event-navy/15 flex items-center justify-center transition-colors group-hover:bg-event-blue/10 group-hover:border-event-blue/30">
                    <Users size={18} className="text-event-navy/40 transition-colors group-hover:text-event-blue" />
                  </div>
                  <StatCounter value={totalPeserta} label="Peserta" />
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ===== TENTANG ===== */}
        <section id="tentang" className="px-4 sm:px-6 py-12 sm:py-16 scroll-mt-20">
          <div className="max-w-4xl mx-auto flex flex-col gap-8">
            <Reveal className="text-center flex flex-col items-center gap-3">
              <SectionEyebrow label="TENTANG EVENT" icon={Sparkles} variant="yellow" index="02" />
              <h2 className="font-heading text-base sm:text-2xl text-event-navy leading-relaxed pixel-shadow-text-sm">
                SATU EVENT,<br />SERIBU PENGALAMAN
              </h2>
              <p className="font-body text-xs sm:text-sm text-event-navy/70 max-w-xl leading-relaxed">
                Pelantikan & Pelatihan PMR Se-Kabupaten Cianjur 2026 adalah ajang berkumpulnya
                anggota Palang Merah Remaja tingkat Madya dan Wira untuk dilantik, dilatih, dan
                mempererat solidaritas kemanusiaan.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Users,
                  title: 'PELANTIKAN',
                  desc: 'Pengukuhan resmi anggota PMR baru dari seluruh sekolah se-Kabupaten Cianjur',
                },
                {
                  icon: Sparkles,
                  title: 'PELATIHAN',
                  desc: 'Materi kepalangmerahan, pertolongan pertama, dan kesiapsiagaan bencana',
                },
                {
                  icon: Tent,
                  title: 'PERKEMAHAN',
                  desc: 'Kegiatan lapangan, giat malam, dan kebersamaan lintas sekolah',
                },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 100}>
                  <div className="pixel-corners bg-white border-3 border-event-navy shadow-pixel p-5 flex flex-col gap-3 h-full hover:-translate-y-1.5 hover:shadow-pixel-lg transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-event-blue border-3 border-event-navy flex items-center justify-center">
                        <item.icon size={22} className="text-white" />
                      </div>
                      <span className="font-heading text-[9px] text-event-navy/25">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="font-heading text-[10px] text-event-navy">{item.title}</h3>
                    <p className="font-body text-xs text-event-navy/70 leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <PixelMarquee items={['DAFTAR SEKARANG', 'KUOTA TERBATAS', 'JANGAN SAMPAI KETINGGALAN']} variant="blue" />

        {/* ===== PENDAFTARAN ===== */}
        <section id="daftar" className="px-4 sm:px-6 py-12 sm:py-16 scroll-mt-20">
          <div className="max-w-5xl mx-auto flex flex-col gap-8">
            <Reveal className="text-center flex flex-col items-center gap-3">
              <SectionEyebrow label="PENDAFTARAN" variant="pink" index="03" />
              <h2 className="font-heading text-base sm:text-2xl text-event-navy leading-relaxed pixel-shadow-text-sm">
                PILIH JALURMU
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <Reveal delay={0}>
                <ActionCard
                  href="/sekolah/daftar"
                  icon={School}
                  title="PENDAFTARAN SEKOLAH"
                  badge="Untuk Pembina/Pelatih"
                  description={`Daftarkan sekolahmu beserta peserta dan pendamping. Biaya Rp${BIAYA_PESERTA.toLocaleString('id-ID')}/peserta dan Rp${BIAYA_PENDAMPING.toLocaleString('id-ID')}/pendamping.`}
                  variant="pink"
                />
              </Reveal>
              <Reveal delay={100}>
                <ActionCard
                  href="/tenda/sewa"
                  icon={Tent}
                  title="SEWA TENDA"
                  badge="Opsional"
                  description="Sewa tenda dari panitia untuk perkemahan. Bisa dilakukan sebelum atau sesudah pendaftaran peserta selesai."
                  variant="yellow"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== TIMELINE ===== */}
        <section id="timeline" className="px-4 sm:px-6 py-12 sm:py-16 scroll-mt-20">
          <div className="max-w-2xl mx-auto flex flex-col gap-8">
            <Reveal className="text-center flex flex-col items-center gap-3">
              <SectionEyebrow label="ALUR PENDAFTARAN" variant="blue" index="04" />
              <h2 className="font-heading text-base sm:text-2xl text-event-navy leading-relaxed pixel-shadow-text-sm">
                CARA IKUTAN
              </h2>
            </Reveal>

            <Reveal delay={100}>
              <div className="relative pixel-corners bg-white border-3 border-event-navy shadow-pixel-lg p-6 sm:p-8 flex flex-col gap-6">
                <HudCorners tone="navy" />
                <div className="flex items-center justify-center">
                  <TimelinePips items={TIMELINE_ITEMS} />
                </div>
                <PixelTimeline items={TIMELINE_ITEMS} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="px-4 sm:px-6 py-12 sm:py-16 scroll-mt-20">
          <div className="max-w-2xl mx-auto flex flex-col gap-8">
            <Reveal className="text-center flex flex-col items-center gap-3">
              <SectionEyebrow label="FAQ" variant="yellow" index="05" />
              <h2 className="font-heading text-base sm:text-2xl text-event-navy leading-relaxed pixel-shadow-text-sm">
                PERTANYAAN UMUM
              </h2>
            </Reveal>

            <Reveal delay={100}>
              <PixelFaq items={FAQ_ITEMS} />
            </Reveal>
          </div>
        </section>

        {/* ===== CTA FINAL ===== */}
        <section className="px-4 sm:px-6 py-12 sm:py-20">
          <Reveal className="max-w-3xl mx-auto">
            <div className="pixel-corners bg-event-navy border-3 border-event-navy shadow-pixel-lg p-8 sm:p-12 flex flex-col items-center gap-6 text-center relative overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <HudCorners tone="white" />

              <div className="relative flex flex-col items-center gap-5">
                <HudStrip index={6} total={SECTION_COUNT} tone="dark" />
                <h2 className="font-heading text-sm sm:text-xl text-white leading-relaxed">
                  SIAP BERGABUNG<span className="animate-blink inline-block w-[8px] h-[0.9em] bg-event-yellow ml-1 align-middle" aria-hidden="true" />
                </h2>
                <p className="font-body text-xs sm:text-sm text-white/70 max-w-md leading-relaxed">
                  Daftarkan sekolahmu sekarang dan jadi bagian dari Pelantikan & Pelatihan PMR
                  Se-Kabupaten Cianjur 2026.
                </p>
                <Link href="/sekolah/daftar" className="group">
                  <div className="shimmer-hover font-heading text-[11px] bg-event-yellow text-event-navy border-3 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] px-8 py-4 hover:bg-event-yellow-dark active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all inline-flex items-center gap-2">
                    DAFTAR SEKARANG
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="border-t-3 border-event-navy bg-white">
          {/* pixel divider — thin repeating block pattern instead of a plain line */}
          <div aria-hidden="true" className="flex h-1.5 w-full">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className={`flex-1 ${i % 4 === 0 ? 'bg-event-pink' : i % 4 === 1 ? 'bg-event-yellow' : i % 4 === 2 ? 'bg-event-blue' : 'bg-event-navy'}`}
              />
            ))}
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="relative w-44 h-30">
                  <Image src="/assets/LogoPMI.jpg" alt="Logo PMI" fill className="object-contain" />
                </div>
                <div className="w-[3px] h-10 bg-event-navy/20" />
                <div className="relative w-20 h-12">
                  <Image src="/assets/LogoEvent.png" alt="Logo Event" fill className="object-contain" />
                </div>
              </div>

              <nav aria-label="Navigasi footer" className="flex items-center gap-4 flex-wrap justify-center">
                {[
                  { href: '#tentang', label: 'Tentang' },
                  { href: '#daftar', label: 'Daftar' },
                  { href: '#timeline', label: 'Alur' },
                  { href: '#faq', label: 'FAQ' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="font-heading text-[9px] text-event-navy/60 hover:text-event-pink transition-colors tracking-wide"
                  >
                    {link.label.toUpperCase()}
                  </a>
                ))}
              </nav>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t-2 border-event-navy/10">
              <p className="font-body text-[11px] text-event-navy/50 text-center sm:text-left">
                © 2026 Palang Merah Indonesia Kabupaten Cianjur
              </p>
              <span className="font-heading text-[8px] text-event-navy/30 tracking-widest">
                PMR EVENT NETWORK &middot; EST. 2025
              </span>
            </div>
          </div>
        </footer>
      </main>

      <BackToTop />
    </>
  )
}