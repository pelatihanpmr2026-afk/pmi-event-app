export const ASAL_UNIT_OPTIONS = [
  { value: 'KSR_MARKAS', label: 'KSR Markas' },
  { value: 'KSR_UNSUR', label: 'KSR Univ. UNSUR' },
  { value: 'KSR_UNPI', label: 'KSR Univ. UNPI' },
] as const

export const DIVISI_OPTIONS = [
  { value: 'KOMANDAN', label: 'Komandan' },
  { value: 'KETUA_PELAKSANA', label: 'Ketua Pelaksana' },
  { value: 'WAKIL_KETUA', label: 'Wakil Ketua' },
  { value: 'BENDAHARA', label: 'Bendahara' },
  { value: 'WAKIL_BENDAHARA_1', label: 'Wakil Bendahara 1' },
  { value: 'WAKIL_BENDAHARA_2', label: 'Wakil Bendahara 2' },
  { value: 'SEKRETARIS', label: 'Sekretaris' },
  { value: 'WAKIL_SEKRETARIS', label: 'Wakil Sekretaris' },
  { value: 'KESEKRETARIATAN', label: 'Kesekretariatan' },
  { value: 'ACARA', label: 'Acara' },
  { value: 'HUMAS_DAN_DOKUMENTASI', label: 'Humas dan Dokumentasi' },
  { value: 'GIAT', label: 'Giat' },
  { value: 'KEAMANAN_DAN_EVAKUASI', label: 'Keamanan dan Evakuasi' },
  { value: 'SANITASI', label: 'Sanitasi' },
  { value: 'TRANSPORTASI', label: 'Transportasi' },
  { value: 'PERKEMAHAN', label: 'Perkemahan' },
  { value: 'DAPUR_UMUM', label: 'Dapur Umum' },
  { value: 'PERALATAN', label: 'Peralatan' },
  { value: 'YANKES', label: 'Yankes' },
] as const

export const DIVISI_CAPACITY: Record<string, number> = {
  KOMANDAN: 1,
  KETUA_PELAKSANA: 1,
  WAKIL_KETUA: 1,
  BENDAHARA: 1,
  WAKIL_BENDAHARA_1: 1,
  WAKIL_BENDAHARA_2: 1,
  SEKRETARIS: 1,
  WAKIL_SEKRETARIS: 1,

  ACARA: 15,
  GIAT: 15,
  PERKEMAHAN: 15,
  HUMAS_DAN_DOKUMENTASI: 15,
  KESEKRETARIATAN: 15,
  KEAMANAN_DAN_EVAKUASI: 15,

  PERALATAN: 10,
  DAPUR_UMUM: 10,
  YANKES: 10,

  SANITASI: 5,
  TRANSPORTASI: 5,
}

export const GENDER_OPTIONS = [
  { value: 'LAKI_LAKI', label: 'Laki-laki' },
  { value: 'PEREMPUAN', label: 'Perempuan' },
] as const

export const MAX_FOTO_SIZE = 5 * 1024 * 1024 // 5MB
export const ACCEPTED_FOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png']