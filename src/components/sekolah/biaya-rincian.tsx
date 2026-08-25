import { BIAYA_PENDAMPING, BIAYA_PESERTA } from '@/lib/constants-sekolah'

const rupiah = (nominal: number) => `Rp${nominal.toLocaleString('id-ID')}`

export function RincianBiaya({ jumlahPeserta, jumlahPendamping, className = '' }: { jumlahPeserta: number; jumlahPendamping: number; className?: string }) {
  const biayaPeserta = jumlahPeserta * BIAYA_PESERTA
  const biayaPendamping = jumlahPendamping * BIAYA_PENDAMPING
  return <div className={`flex flex-col gap-2 ${className}`}>
    <div className="flex justify-between gap-3 font-body text-xs text-event-navy"><span>{jumlahPeserta} Peserta x {rupiah(BIAYA_PESERTA)}</span><span>{rupiah(biayaPeserta)}</span></div>
    <div className="flex justify-between gap-3 font-body text-xs text-event-navy"><span>{jumlahPendamping} Pendamping x {rupiah(BIAYA_PENDAMPING)}</span><span>{rupiah(biayaPendamping)}</span></div>
    <div className="flex justify-between gap-3 border-t-2 border-event-navy/20 pt-2 font-heading text-xs text-event-navy"><span>TOTAL YANG HARUS DITRANSFER</span><span>{rupiah(biayaPeserta + biayaPendamping)}</span></div>
    <p className="font-body text-[11px] text-event-navy/70">Transfer tepat sesuai nominal agar verifikasi lebih cepat.</p>
  </div>
}
