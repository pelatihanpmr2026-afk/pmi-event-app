import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Ambil maksimal 2 kata pertama nama dan jadikan huruf kapital semua. */
export function ringkasNamaPanitia(nama: string): string {
  return nama.trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase()
}