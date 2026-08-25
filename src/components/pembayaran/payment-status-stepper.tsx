import { CheckCircle2, Clock3, FileCheck2, XCircle } from 'lucide-react'

type Status = 'BELUM_BAYAR' | 'MENUNGGU_KONFIRMASI' | 'LUNAS' | 'DITOLAK'
const steps = [{ label: 'Data terkirim', icon: FileCheck2 }, { label: 'Bukti transfer diterima', icon: Clock3 }, { label: 'Menunggu verifikasi panitia', icon: Clock3 }, { label: 'Lunas', icon: CheckCircle2 }]

export function PaymentStatusStepper({ status }: { status: Status }) {
  if (status === 'DITOLAK') return <div className="flex items-center gap-2 border-2 border-pmi-red bg-pmi-red/10 p-3"><XCircle size={18} className="shrink-0 text-pmi-red" /><p className="font-body text-xs text-event-navy">Bukti transfer perlu diperbaiki sebelum pembayaran dapat diverifikasi.</p></div>
  const completed = status === 'LUNAS' ? 4 : status === 'MENUNGGU_KONFIRMASI' ? 3 : 1
  return <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Status pembayaran">{steps.map((step, index) => { const Icon = step.icon; const active = index + 1 <= completed; return <li key={step.label} className={`border-2 p-2 text-center ${active ? 'border-event-blue bg-event-blue/10 text-event-navy' : 'border-event-navy/20 bg-white text-event-navy/45'}`}><Icon size={15} className="mx-auto mb-1" /><span className="font-body text-[10px] leading-tight">{step.label}</span></li> })}</ol>
}
