#!/usr/bin/env node
/**
 * Audit pemaksa-guard: pastikan SEMUA route handler API admin memanggil
 * requireRole(...) / requireAdmin(...) / getSession(...).
 *
 * Route yang sengaja publik didefinisikan eksplisit di PUBLIC set di bawah —
 * ini sekaligus menjadi "tagging role per route" dari roadmap P0.
 *
 * Cara pakai: `node scripts/audit-route-guards.mjs`
 * Dipanggil otomatis lewat `prebuild` supaya hilangnya guard = build gagal.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_ROOT = fileURLToPath(new URL('../src/app/api', import.meta.url))

// Route publik (tanpa session/role) — format: "METHOD route"
const PUBLIC = new Set([
  'POST auth/login',
  'POST auth/logout',
  'POST sekolah', // pendaftaran publik (di-rate-limit)
  'GET sekolah/search',
  'GET sekolah/check-nama',
  'POST sekolah/mini',
  'POST sekolah/tenda/verify',
  'GET sekolah/susulan/verify',
  'POST sekolah/susulan/select', // pilih sekolah saat no WA terdaftar di beberapa sekolah
  'GET sekolah/[id]/kapasitas-tenda',
  'GET sekolah/[id]/susulan',
  'POST sekolah/[id]/susulan',
  'POST sekolah/[id]/tenda',
  'GET sekolah/[id]/pembayaran/[tipe]',
  'POST sekolah/[id]/pembayaran/[tipe]',
  'POST sekolah/[id]/pembayaran/verify', // verifikasi kode+noWa untuk menerbitkan sesi upload bukti
  'POST panitia',
  'GET panitia/capacity',
  'GET tenda',
  'POST tenda/reservasi',
  'POST tenda/draft-payment',
  'GET tenda/reservasi/[id]', // read-only rincian draft reservasi (link dipakai pembina tanpa login)
  'POST absensi/scan',
  'POST pengajuan-anggaran',
  'POST pengajuan-anggaran/preview-pdf',
  'POST pengajuan-anggaran/[id]/pdf', // generate ulang PDF untuk tombol download (sukses + modal)
  'POST pengajuan-anggaran/[id]/verify', // verifikasi no WA koordinator untuk akses edit pengajuan
  'POST pengajuan-anggaran/[id]/edit', // edit/tambah item oleh pengaju (verifikasi no WA)
  'POST cron/cleanup-tenda', // dilindungi CRON_SECRET, bukan session admin
])

const HANDLER_RE = /export async function (GET|POST|PATCH|PUT|DELETE)\(/g
const GUARD_RE = /requireRole\(|requireAdmin\(|\bgetSession\(/

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name === 'route.ts') out.push(full)
  }
  return out
}

function routeKeyOf(absPath) {
  const rel = relative(API_ROOT, absPath)
  const parts = rel.split(sep)
  parts.pop() // buang "route.ts"
  return parts.join('/')
}

let failures = 0

for (const file of walk(API_ROOT)) {
  const src = readFileSync(file, 'utf8')
  const route = routeKeyOf(file)

  // Pisahkan tiap handler dengan slicing dari index ke index berikutnya.
  const matches = [...src.matchAll(HANDLER_RE)]
  for (let i = 0; i < matches.length; i++) {
    const method = matches[i][1]
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index : src.length
    const body = src.slice(start, end)

    const isPublic = PUBLIC.has(`${method} ${route}`)
    if (isPublic) continue

    if (!GUARD_RE.test(body)) {
      failures++
      console.error(
        `[guard] MISSING: ${method.toUpperCase()} /api/${route} — tidak memanggil requireRole/requireAdmin/getSession`
      )
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} route handler tanpa guard. Perbaiki sebelum build.`)
  process.exit(1)
}

console.log('✓ Semua route handler API admin memiliki guard (atau terdaftar publik).')