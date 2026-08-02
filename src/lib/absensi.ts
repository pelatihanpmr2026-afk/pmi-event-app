interface SesiLike {
  tanggal: Date
  jamMulai: string
  jamSelesai: string
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const combined = new Date(date)
  combined.setHours(hours, minutes, 0, 0)
  return combined
}

export function isSesiActive(sesi: SesiLike, now: Date = new Date()): boolean {
  const mulai = combineDateAndTime(sesi.tanggal, sesi.jamMulai)
  const selesai = combineDateAndTime(sesi.tanggal, sesi.jamSelesai)
  return now >= mulai && now <= selesai
}

export function getSesiStatus(sesi: SesiLike, now: Date = new Date()): 'AKTIF' | 'BELUM_MULAI' | 'SELESAI' {
  const mulai = combineDateAndTime(sesi.tanggal, sesi.jamMulai)
  const selesai = combineDateAndTime(sesi.tanggal, sesi.jamSelesai)

  if (now < mulai) return 'BELUM_MULAI'
  if (now > selesai) return 'SELESAI'
  return 'AKTIF'
}