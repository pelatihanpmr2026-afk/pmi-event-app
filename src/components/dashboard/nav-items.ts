import { Users, ScanLine } from 'lucide-react'

export const DASHBOARD_NAV_ITEMS = [
  { href: '/dashboard/panitia', label: 'Panitia', icon: Users },
  { href: '/dashboard/absensi', label: 'Absensi', icon: ScanLine },
] as const