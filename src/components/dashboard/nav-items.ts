import { Users, ScanLine, School, Tent, ClipboardCheck, Wallet, FileSpreadsheet, UserCog, Users2, CalendarClock } from 'lucide-react'

export const DASHBOARD_NAV_ITEMS = [
  { href: '/dashboard/panitia', label: 'Panitia', icon: Users },
  { href: '/dashboard/sekolah', label: 'Sekolah', icon: School },
  { href: '/dashboard/peserta', label: 'Peserta', icon: UserCog },
  { href: '/dashboard/pendamping', label: 'Pendamping', icon: Users2 },
  { href: '/dashboard/tenda', label: 'Tenda', icon: Tent },
  { href: '/dashboard/keuangan', label: 'Keuangan', icon: Wallet },
  { href: '/dashboard/rekap-harian', label: 'Rekap Harian', icon: CalendarClock },
  { href: '/dashboard/pengajuan', label: 'Pengajuan', icon: FileSpreadsheet },
  { href: '/dashboard/daftar-ulang', label: 'Daftar Ulang', icon: ClipboardCheck },
  { href: '/dashboard/absensi', label: 'Absensi', icon: ScanLine },
] as const