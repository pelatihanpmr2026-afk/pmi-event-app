// src/hooks/use-media-query.ts
'use client'
import { useSyncExternalStore } from 'react'

function subscribe(query: string, callback: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot(query: string) {
  return window.matchMedia(query).matches
}

function getServerSnapshot() {
  // Saat SSR/hydration awal, anggap belum tentu desktop.
  // (Kalau mayoritas trafik kamu dari HP, `false` lebih aman biar tidak flash desktop-view di HP)
  return false
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => getSnapshot(query),
    getServerSnapshot
  )
}