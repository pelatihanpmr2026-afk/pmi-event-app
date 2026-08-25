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
      <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-navy text-white">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} />
          <span className="font-body text-xs font-medium">Total Pengajuan</span>
        </div>
        <span className="font-body text-2xl font-bold">{total}</span>
      </Card>

      <Card className="p-4 sm:p-5 flex flex-col gap-2 bg-event-yellow">
        <div className="flex items-center gap-2 text-event-navy">
          <Clock size={18} />
          <span className="font-body text-xs text-gray-600">Menunggu Diproses</span>
        </div>
        <span className="font-body text-2xl font-bold text-event-navy">{menunggu}</span>
      </Card>

      <Card className="p-4 sm:p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-event-navy">
          <CheckCircle2 size={18} className="text-green-600" />
          <span className="font-body text-xs text-gray-500">Disetujui</span>
        </div>
        <span className="font-body text-2xl font-bold text-event-navy">{disetujui}</span>
        <span className="font-body text-xs text-gray-400">
          Rp{totalNominalDisetujui.toLocaleString('id-ID')}
        </span>
      </Card>

      <Card className="p-4 sm:p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-event-navy">
          <XCircle size={18} className="text-pmi-red" />
          <span className="font-body text-xs text-gray-500">Ditolak</span>
        </div>
        <span className="font-body text-2xl font-bold text-event-navy">{ditolak}</span>
      </Card>
    </div>
  )
}