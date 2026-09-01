import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Tent } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/home/section-header'

export interface TendaInfoItem {
  id: string
  nama: string
  gambarUrl: string | null
  kapasitasMin: number
  kapasitasMax: number
  harga: number
  stokTotal: number
}

export function TendaInfoCards({ tendaList, section = true }: { tendaList: TendaInfoItem[]; section?: boolean }) {
  const content = (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 sm:gap-10">
      <SectionHeader
        badge="INFORMASI TENDA"
        tone="blue"
        title="PILIH TENDA SESUAI KEBUTUHAN"
        subtitle="Lihat kapasitas dan harga setiap jenis tenda sebelum melanjutkan ke proses sewa. Stok dan pilihan final akan dikonfirmasi pada tahap pemesanan."
      />

      {tendaList.length === 0 ? (
        <div className="border-3 border-event-navy bg-white shadow-pixel p-6 text-center">
          <p className="font-body text-sm text-event-navy/60">Informasi tenda sedang disiapkan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {tendaList.map((tenda) => (
            <article key={tenda.id} className="bg-white border-3 border-event-navy shadow-pixel-sm overflow-hidden flex flex-col">
              <div className="relative aspect-[16/10] bg-event-cream">
                {tenda.gambarUrl ? (
                  <Image src={tenda.gambarUrl} alt={tenda.nama} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                ) : (
                  <div className="h-full flex items-center justify-center"><Tent size={42} className="text-event-navy/20" /></div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <h3 className="font-heading text-xs text-event-navy leading-relaxed">{tenda.nama}</h3>
                  <p className="font-body text-xs text-event-navy/60 mt-1">Kapasitas {tenda.kapasitasMin}–{tenda.kapasitasMax} orang</p>
                </div>
                <div className="flex items-end justify-between gap-3 mt-auto">
                  <div>
                    <p className="font-body text-[10px] text-event-navy/50">Harga sewa</p>
                    <p className="font-heading text-sm text-event-blue">Rp{tenda.harga.toLocaleString('id-ID')}<span className="font-body text-[10px] text-event-navy/50">/unit</span></p>
                  </div>
                  <Badge variant={tenda.stokTotal > 0 ? 'success' : 'warning'}>{tenda.stokTotal > 0 ? 'Tersedia' : 'Stok habis'}</Badge>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <Link href="/tenda/sewa" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-event-yellow text-event-navy border-3 border-event-navy shadow-pixel px-6 py-3.5 font-heading text-[10px] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg transition-all">
          MULAI SEWA TENDA <ArrowRight size={14} />
        </Link>
        <Link href="/tenda/informasi" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-event-navy border-2 border-event-navy px-6 py-3.5 font-body font-semibold text-xs hover:bg-event-cream transition-colors">
          Lihat informasi lengkap
        </Link>
      </div>
    </div>
  )

  if (!section) return content
  return <section id="tenda" className="px-4 sm:px-6 py-12 sm:py-16 scroll-mt-20 relative"><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-event-navy/20 to-transparent" aria-hidden="true" />{content}</section>
}
