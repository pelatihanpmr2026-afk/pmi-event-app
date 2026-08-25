import { Users,StarIcon, ScanLine, School, Tent, ClipboardCheck, Wallet, FileSpreadsheet, UserCog, Users2, CalendarClock, History, ListChecks } from 'lucide-react'
import { isPathAllowedForRole, type AdminRoleType } from '@/lib/admin-role'

export const DASHBOARD_NAV_ITEMS = [
  { href: '/dashboard', label: 'Umum', icon: StarIcon },
  { href: '/dashboard/antrian-pembayaran', label: 'Antrian Pembayaran', icon: ListChecks },
  { href: '/dashboard/sekolah', label: 'Sekolah', icon: School },
  { href: '/dashboard/daftar-ulang', label: 'Daftar Ulang', icon: ClipboardCheck },
  { href: '/dashboard/peserta', label: 'Peserta', icon: UserCog },
  { href: '/dashboard/pendamping', label: 'Pendamping', icon: Users2 },
  { href: '/dashboard/tenda', label: 'Tenda', icon: Tent },
  { href: '/dashboard/keuangan', label: 'Keuangan', icon: Wallet },
  { href: '/dashboard/rekap-harian', label: 'Rekap Harian', icon: CalendarClock },
  { href: '/dashboard/pengajuan', label: 'Pengajuan', icon: FileSpreadsheet },
  { href: '/dashboard/panitia', label: 'Panitia', icon: Users },
  { href: '/dashboard/absensi', label: 'Absensi', icon: ScanLine },
  { href: '/dashboard/admin-logs', label: 'Admin Logs', icon: History },
] as const

export function getNavItemsForRole(role: AdminRoleType) {
  // SUPERADMIN melihat SEMUA item, termasuk Admin Logs
  if (role === 'SUPERADMIN') {
    return DASHBOARD_NAV_ITEMS
  }
  // Antrian Pembayaran hanya untuk KESEKRETARIATAN (SUPERADMIN sudah di-handle di atas).
  return DASHBOARD_NAV_ITEMS.filter(
    (item) =>
      item.href === '/dashboard/antrian-pembayaran'
        ? role === 'KESEKRETARIATAN'
        : isPathAllowedForRole(role, item.href)
  )
}