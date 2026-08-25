export type AdminRoleType = 'SUPERADMIN' | 'KESEKRETARIATAN' | 'KEUANGAN' | 'ACARA' | 'KTA'

export const ROLE_PATH_ACCESS: Record<Exclude<AdminRoleType, 'SUPERADMIN'>, string[]> = {
KESEKRETARIATAN: [
    '/dashboard/sekolah',
    '/dashboard/rekap-harian',
    '/dashboard/daftar-ulang',
    '/dashboard/peserta',
    '/dashboard/pendamping',
    '/dashboard/tenda',
    '/dashboard/panitia',
    '/dashboard/absensi',
    '/dashboard/antrian-pembayaran',
  ],
  KEUANGAN: ['/dashboard/sekolah', '/dashboard/keuangan', '/dashboard/rekap-harian', '/dashboard/pengajuan'],
  ACARA: ['/dashboard/sekolah'],
  KTA: ['/dashboard/sekolah'],
}

export function isPathAllowedForRole(role: AdminRoleType, pathname: string): boolean {
  if (role === 'SUPERADMIN') return true
  const allowed = ROLE_PATH_ACCESS[role]
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function getDefaultPathForRole(role: AdminRoleType): string {
  if (role === 'SUPERADMIN') return '/dashboard'
  const allowed = ROLE_PATH_ACCESS[role]
  return allowed[0] ?? '/dashboard/sekolah'
}

export function canConfirmPembayaran(role: AdminRoleType): boolean {
  return role === 'SUPERADMIN' || role === 'KESEKRETARIATAN' || role === 'KEUANGAN'
}

export function isReadOnlySekolah(role: AdminRoleType): boolean {
  return role === 'ACARA'
}

/** Role KTA: hanya akses daftar sekolah untuk mencetak data peserta. */
export function isKtaRole(role: AdminRoleType): boolean {
  return role === 'KTA'
}