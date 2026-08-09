import { Card } from '@/components/ui/card'
import { FileSpreadsheet, Clock, CheckCircle2, XCircle } from 'lucide-react'

export function PengajuanStats({
  total,
  menunggu,
  disetujui,
  ditolak,
  totalNominalDisetujui,
}: {
  total: number
  menunggu: number
  disetujui: number
  ditolak: number
  totalNominalDisetujui: number
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card className="p-4 flex flex-col gap-2 bg-event-navy text-white">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} />
          <span className="font-body text-xs">Total Pengajuan</span>
        </div>
        <span className="font-heading text-lg">{total}</span>
      </Card>

      <Card className="p-4 flex flex-col gap-2 bg-event-yellow">
        <div className="flex items-center gap-2 text-event-navy">
          <Clock size={18} />
          <span className="font-body text-xs">Menunggu Diproses</span>
        </div>
        <span className="font-heading text-lg text-event-navy">{menunggu}</span>
      </Card>

      <Card className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-event-navy">
          <CheckCircle2 size={18} className="text-green-600" />
          <span className="font-body text-xs">Disetujui</span>
        </div>
        <span className="font-heading text-lg text-event-navy">{disetujui}</span>
        <span className="font-body text-[10px] text-event-navy/50">
          Rp{totalNominalDisetujui.toLocaleString('id-ID')}
        </span>
      </Card>

      <Card className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-event-navy">
          <XCircle size={18} className="text-pmi-red" />
          <span className="font-body text-xs">Ditolak</span>
        </div>
        <span className="font-heading text-lg text-event-navy">{ditolak}</span>
      </Card>
    </div>
  )
}